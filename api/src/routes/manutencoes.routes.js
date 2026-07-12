import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

const BASE_SELECT = `
  SELECT m.id, m.os, m.titulo, m.tipo, m.tecnico, m.custo, m.descricao, m.data, m.status,
         m.created_at, m.updated_at,
         e.id AS equipamento_id, e.patrimonio, e.serial, e.modelo
  FROM manutencoes m
  JOIN equipamentos e ON e.id = m.equipamento_id
`;

function mapRow(r) {
  return {
    id: r.id,
    os: r.os,
    titulo: r.titulo,
    tipo: r.tipo,
    tecnico: r.tecnico,
    custo: r.custo !== null ? Number(r.custo) : null,
    descricao: r.descricao,
    data: r.data,
    status: r.status,
    equipamento: { id: r.equipamento_id, patrimonio: r.patrimonio, serial: r.serial, modelo: r.modelo },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SORT_COLUMNS = {
  os: 'm.os', data: 'm.data', status: 'm.status', tipo: 'm.tipo',
  custo: 'm.custo', tecnico: 'm.tecnico', updatedAt: 'm.updated_at',
};

async function nextOsNumber() {
  const { rows } = await query(
    `SELECT os FROM manutencoes ORDER BY id DESC LIMIT 1`
  );
  const last = rows[0]?.os;
  const n = last ? parseInt(last.replace('OS-', ''), 10) + 1 : 1;
  return `OS-${String(n).padStart(4, '0')}`;
}

/**
 * @openapi
 * /manutencoes:
 *   get:
 *     tags: [Manutenções]
 *     summary: Lista ordens de serviço com filtros e paginação
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista paginada de manutenções }
 */
router.get(
  '/',
  requireAuth,
  requirePermission('manutencoes', 'ver'),
  asyncHandler(async (req, res) => {
    const { status, tipo, equipamentoId, q } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'm.data DESC'.split(' ')[0]);

    const conditions = ['m.deleted_at IS NULL'];
    const params = [];
    if (status) {
      params.push(status);
      conditions.push(`m.status = $${params.length}`);
    }
    if (tipo) {
      params.push(tipo);
      conditions.push(`m.tipo = $${params.length}`);
    }
    if (equipamentoId) {
      params.push(equipamentoId);
      conditions.push(`m.equipamento_id = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(m.os ILIKE $${idx} OR m.titulo ILIKE $${idx} OR e.patrimonio ILIKE $${idx} OR e.serial ILIKE $${idx})`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM manutencoes m JOIN equipamentos e ON e.id = m.equipamento_id ${where}`, params);
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(paginatedResponse({ data: rows.map(mapRow), total, page, limit }));
  })
);

router.get(
  '/:id',
  requireAuth,
  requirePermission('manutencoes', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1 AND m.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Manutenção');
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /manutencoes:
 *   post:
 *     tags: [Manutenções]
 *     summary: Abre uma nova ordem de serviço
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: OS criada }
 */
router.post(
  '/',
  requireAuth,
  requirePermission('manutencoes', 'criar'),
  asyncHandler(async (req, res) => {
    const { equipamentoId, titulo, tipo, tecnico, custo, descricao, data, status } = req.body;
    if (!equipamentoId || !titulo || !tipo) throw badRequest('Campos obrigatórios: equipamentoId, titulo, tipo.');

    const os = await nextOsNumber();
    const { rows } = await query(
      `INSERT INTO manutencoes (os, equipamento_id, titulo, tipo, tecnico, custo, descricao, data, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,CURRENT_DATE),COALESCE($9,'Aberta')) RETURNING id`,
      [os, equipamentoId, titulo, tipo, tecnico || null, custo || 0, descricao || null, data || null, status || null]
    );
    const { rows: created } = await query(`${BASE_SELECT} WHERE m.id = $1`, [rows[0].id]);
    res.status(201).json(mapRow(created[0]));
  })
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('manutencoes', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM manutencoes WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Manutenção');

    const fields = {
      titulo: 'titulo', tipo: 'tipo', tecnico: 'tecnico', custo: 'custo',
      descricao: 'descricao', data: 'data', status: 'status', equipamentoId: 'equipamento_id',
    };
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(fields)) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key] === '' ? null : req.body[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw badRequest('Nenhum campo para atualizar.');
    params.push(req.params.id);
    await query(`UPDATE manutencoes SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /manutencoes/{id}/status:
 *   patch:
 *     tags: [Manutenções]
 *     summary: Move a OS entre colunas do Kanban (Aberta / Em andamento / Concluida)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status atualizado }
 */
router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('manutencoes', 'editar'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['Aberta', 'Em andamento', 'Concluida'].includes(status)) throw badRequest('Status inválido.');
    const result = await query(`UPDATE manutencoes SET status = $1 WHERE id = $2 AND deleted_at IS NULL`, [status, req.params.id]);
    if (result.rowCount === 0) throw notFound('Manutenção');
    const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('manutencoes', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE manutencoes SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Manutenção');
    res.status(204).send();
  })
);

export default router;
