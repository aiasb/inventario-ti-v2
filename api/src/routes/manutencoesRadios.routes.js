import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission, requireEmpresa } from '../middleware/auth.js';

const router = Router();

const BASE_SELECT = `
  SELECT m.id, m.os, m.titulo, m.tipo, m.tecnico, m.custo, m.descricao, m.data, m.status,
         m.created_at, m.updated_at,
         r.id AS radio_id, r.numero_serie, r.modelo,
         i.id AS insumo_id, i.nome AS insumo_nome
  FROM manutencoes_radios m
  JOIN radios r ON r.id = m.radio_id
  LEFT JOIN insumos i ON i.id = m.insumo_id
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
    radio: { id: r.radio_id, numeroSerie: r.numero_serie, modelo: r.modelo },
    insumo: r.insumo_id ? { id: r.insumo_id, nome: r.insumo_nome } : null,
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
    `SELECT os FROM manutencoes_radios ORDER BY id DESC LIMIT 1`
  );
  const last = rows[0]?.os;
  const n = last ? parseInt(last.replace('OSR-', ''), 10) + 1 : 1;
  return `OSR-${String(n).padStart(4, '0')}`;
}

router.get(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'ver'),
  asyncHandler(async (req, res) => {
    const { status, tipo, radioId, q } = req.query;
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
    if (radioId) {
      params.push(radioId);
      conditions.push(`m.radio_id = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(m.os ILIKE $${idx} OR m.titulo ILIKE $${idx} OR r.numero_serie ILIKE $${idx})`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM manutencoes_radios m JOIN radios r ON r.id = m.radio_id ${where}`, params);
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
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1 AND m.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Manutenção');
    res.json(mapRow(rows[0]));
  })
);

router.post(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'criar'),
  asyncHandler(async (req, res) => {
    const { radioId, insumoId, tipo, tecnico, custo, descricao, data, status } = req.body;
    if (!radioId || !insumoId || !tipo) throw badRequest('Campos obrigatórios: radioId, insumoId, tipo.');

    const { rows: insumoRows } = await query(`SELECT nome FROM insumos WHERE id = $1 AND deleted_at IS NULL`, [insumoId]);
    if (!insumoRows[0]) throw badRequest('Insumo inválido.');
    const titulo = insumoRows[0].nome;

    const os = await nextOsNumber();
    const { rows } = await query(
      `INSERT INTO manutencoes_radios (os, radio_id, insumo_id, titulo, tipo, tecnico, custo, descricao, data, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,CURRENT_DATE),COALESCE($10,'Aberta')) RETURNING id`,
      [os, radioId, insumoId, titulo, tipo, tecnico || null, custo || 0, descricao || null, data || null, status || null]
    );
    const { rows: created } = await query(`${BASE_SELECT} WHERE m.id = $1`, [rows[0].id]);
    res.status(201).json(mapRow(created[0]));
  })
);

router.put(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM manutencoes_radios WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Manutenção');

    if (req.body.insumoId !== undefined) {
      const { rows: insumoRows } = await query(`SELECT nome FROM insumos WHERE id = $1 AND deleted_at IS NULL`, [req.body.insumoId]);
      if (!insumoRows[0]) throw badRequest('Insumo inválido.');
      req.body.titulo = insumoRows[0].nome;
    }

    const fields = {
      titulo: 'titulo', tipo: 'tipo', tecnico: 'tecnico', custo: 'custo',
      descricao: 'descricao', data: 'data', status: 'status', radioId: 'radio_id', insumoId: 'insumo_id',
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
    await query(`UPDATE manutencoes_radios SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

router.patch(
  '/:id/status',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'editar'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['Aberta', 'Em andamento', 'Concluida'].includes(status)) throw badRequest('Status inválido.');
    const result = await query(`UPDATE manutencoes_radios SET status = $1 WHERE id = $2 AND deleted_at IS NULL`, [status, req.params.id]);
    if (result.rowCount === 0) throw notFound('Manutenção');
    const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE manutencoes_radios SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Manutenção');
    res.status(204).send();
  })
);

export default router;
