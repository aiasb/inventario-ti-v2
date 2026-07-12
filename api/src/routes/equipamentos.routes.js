import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

const uploadsDir = path.resolve(config.uploadsDir);
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `equip-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(badRequest('Envie uma imagem JPEG, PNG ou WEBP.'));
    }
    cb(null, true);
  },
});

const BASE_SELECT = `
  SELECT e.id, e.patrimonio, e.serial, e.hostname, e.imei, e.modelo, e.status,
         e.data_aquisicao, e.data_garantia, e.foto_url,
         e.observacoes, e.created_at, e.updated_at,
         t.id AS tipo_id, t.nome AS tipo_nome, t.prefixo_hostname,
         s.id AS setor_id, s.nome AS setor_nome,
         fo.id AS fornecedor_id, fo.nome AS fornecedor_nome,
         resp.id AS responsavel_id, resp.nome AS responsavel_nome
  FROM equipamentos e
  LEFT JOIN tipos_equipamento t ON t.id = e.tipo_id
  LEFT JOIN setores s ON s.id = e.setor_id
  LEFT JOIN fornecedores fo ON fo.id = e.fornecedor_id
  LEFT JOIN responsaveis resp ON resp.id = e.responsavel_id
`;

function mapRow(r) {
  return {
    id: r.id,
    patrimonio: r.patrimonio,
    serial: r.serial,
    hostname: r.hostname,
    imei: r.imei,
    modelo: r.modelo,
    status: r.status,
    usuarioResponsavel: r.responsavel_nome,
    responsavel: r.responsavel_id ? { id: r.responsavel_id, nome: r.responsavel_nome } : null,
    dataAquisicao: r.data_aquisicao,
    dataGarantia: r.data_garantia,
    fotoUrl: r.foto_url,
    observacoes: r.observacoes,
    tipo: r.tipo_id ? { id: r.tipo_id, nome: r.tipo_nome, prefixoHostname: r.prefixo_hostname } : null,
    setor: r.setor_id ? { id: r.setor_id, nome: r.setor_nome } : null,
    fornecedor: r.fornecedor_id ? { id: r.fornecedor_id, nome: r.fornecedor_nome } : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SORT_COLUMNS = {
  serial: 'e.serial',
  patrimonio: 'e.patrimonio',
  modelo: 'e.modelo',
  hostname: 'e.hostname',
  status: 'e.status',
  tipo: 't.nome',
  setor: 's.nome',
  usuario: 'resp.nome',
  dataGarantia: 'e.data_garantia',
  dataAquisicao: 'e.data_aquisicao',
  updatedAt: 'e.updated_at',
};

/**
 * @openapi
 * /equipamentos:
 *   get:
 *     tags: [Equipamentos]
 *     summary: Lista equipamentos com filtros, ordenação e paginação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: tipoId
 *         schema: { type: integer }
 *       - in: query
 *         name: setorId
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: serial
 *         schema: { type: string }
 *       - in: query
 *         name: modelo
 *         schema: { type: string }
 *       - in: query
 *         name: usuario
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista paginada de equipamentos }
 */
router.get(
  '/',
  requireAuth,
  requirePermission('inventario', 'ver'),
  asyncHandler(async (req, res) => {
    const { status, tipoId, setorId, q, serial, modelo, usuario } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'e.updated_at DESC'.split(' ')[0]);

    const conditions = ['e.deleted_at IS NULL'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }
    if (tipoId) {
      params.push(tipoId);
      conditions.push(`e.tipo_id = $${params.length}`);
    }
    if (setorId) {
      params.push(setorId);
      conditions.push(`e.setor_id = $${params.length}`);
    }
    if (serial) {
      params.push(`%${serial}%`);
      conditions.push(`e.serial ILIKE $${params.length}`);
    }
    if (modelo) {
      params.push(`%${modelo}%`);
      conditions.push(`e.modelo ILIKE $${params.length}`);
    }
    if (usuario) {
      params.push(`%${usuario}%`);
      conditions.push(`resp.nome ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(
        `(e.serial ILIKE $${idx} OR e.modelo ILIKE $${idx} OR e.patrimonio ILIKE $${idx} OR e.hostname ILIKE $${idx} OR resp.nome ILIKE $${idx})`
      );
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM equipamentos e LEFT JOIN responsaveis resp ON resp.id = e.responsavel_id ${where}`,
      params
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json(paginatedResponse({ data: rows.map(mapRow), total, page, limit }));
  })
);

/**
 * @openapi
 * /equipamentos/sync:
 *   get:
 *     tags: [Equipamentos]
 *     summary: Sincronização incremental (uso offline-first do app Android)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: updated_since
 *         required: false
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Lista de equipamentos alterados desde a data informada }
 */
router.get(
  '/sync',
  requireAuth,
  requirePermission('inventario', 'ver'),
  asyncHandler(async (req, res) => {
    const { updated_since: updatedSince } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (updatedSince) {
      params.push(updatedSince);
      where += ` AND e.updated_at >= $${params.length}`;
    }
    const { rows } = await query(`${BASE_SELECT} ${where} ORDER BY e.updated_at ASC LIMIT 1000`, params);
    res.json({ data: rows.map(mapRow), syncedAt: new Date().toISOString() });
  })
);

/**
 * @openapi
 * /equipamentos/serial/{serial}:
 *   get:
 *     tags: [Equipamentos]
 *     summary: Consulta rápida por número de série (leitura de etiqueta/código de barras)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Equipamento encontrado }
 *       404: { description: Não encontrado }
 */
router.get(
  '/serial/:serial',
  requireAuth,
  requirePermission('inventario', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE e.serial = $1 AND e.deleted_at IS NULL`, [req.params.serial]);
    if (!rows[0]) throw notFound('Equipamento');
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /equipamentos/hostname/{hostname}:
 *   get:
 *     tags: [Equipamentos]
 *     summary: Consulta rápida por hostname
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Equipamento encontrado }
 *       404: { description: Não encontrado }
 */
router.get(
  '/hostname/:hostname',
  requireAuth,
  requirePermission('inventario', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE e.hostname = $1 AND e.deleted_at IS NULL`, [
      req.params.hostname,
    ]);
    if (!rows[0]) throw notFound('Equipamento');
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /equipamentos/{id}:
 *   get:
 *     tags: [Equipamentos]
 *     summary: Detalhe de um equipamento (inclui histórico de manutenções)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Equipamento }
 *       404: { description: Não encontrado }
 */
router.get(
  '/:id',
  requireAuth,
  requirePermission('inventario', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE e.id = $1 AND e.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Equipamento');

    const { rows: manutencoes } = await query(
      `SELECT id, os, titulo, tipo, tecnico, custo, data, status FROM manutencoes
       WHERE equipamento_id = $1 AND deleted_at IS NULL ORDER BY data DESC`,
      [req.params.id]
    );

    res.json({ ...mapRow(rows[0]), manutencoes });
  })
);

function validateEquipamentoBody(body, { partial = false } = {}) {
  const required = ['tipoId', 'modelo', 'serial'];
  if (!partial) {
    for (const field of required) {
      if (!body[field]) throw badRequest(`Campo obrigatório ausente: ${field}`);
    }
  }
}

async function nextPatrimonio() {
  const { rows } = await query(
    `SELECT patrimonio FROM equipamentos WHERE patrimonio ~ '^PAT-[0-9]+$'
     ORDER BY (regexp_replace(patrimonio, '\\D', '', 'g'))::int DESC LIMIT 1`
  );
  const last = rows[0]?.patrimonio;
  const n = last ? parseInt(last.replace('PAT-', ''), 10) + 1 : 1;
  return `PAT-${String(n).padStart(5, '0')}`;
}

/**
 * @openapi
 * /equipamentos:
 *   post:
 *     tags: [Equipamentos]
 *     summary: Cadastra um novo equipamento
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Equipamento criado }
 */
router.post(
  '/',
  requireAuth,
  requirePermission('inventario', 'criar'),
  asyncHandler(async (req, res) => {
    validateEquipamentoBody(req.body);
    const {
      tipoId, modelo, serial, hostname, imei, setorId, fornecedorId,
      responsavelId, status, dataAquisicao, dataGarantia, observacoes,
    } = req.body;
    if (status === 'Ativo' && !responsavelId) {
      throw badRequest('Equipamentos com status Ativo precisam de um responsável.');
    }
    const patrimonio = req.body.patrimonio || (await nextPatrimonio());

    const { rows } = await query(
      `INSERT INTO equipamentos
        (patrimonio, tipo_id, modelo, serial, hostname, imei, setor_id, fornecedor_id,
         responsavel_id, status, data_aquisicao, data_garantia, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'Estoque'),$11,$12,$13)
       RETURNING id`,
      [patrimonio, tipoId, modelo, serial, hostname || null, imei || null, setorId || null,
       fornecedorId || null, responsavelId || null, status || null, dataAquisicao || null,
       dataGarantia || null, observacoes || null]
    );

    const { rows: created } = await query(`${BASE_SELECT} WHERE e.id = $1`, [rows[0].id]);
    res.status(201).json(mapRow(created[0]));
  })
);

/**
 * @openapi
 * /equipamentos/{id}:
 *   put:
 *     tags: [Equipamentos]
 *     summary: Atualiza um equipamento
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Equipamento atualizado }
 */
router.put(
  '/:id',
  requireAuth,
  requirePermission('inventario', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(
      `SELECT id, status, responsavel_id FROM equipamentos WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!existing.rows[0]) throw notFound('Equipamento');

    validateEquipamentoBody(req.body, { partial: true });

    const resultingStatus = req.body.status !== undefined ? req.body.status : existing.rows[0].status;
    const resultingResponsavelId =
      req.body.responsavelId !== undefined ? req.body.responsavelId : existing.rows[0].responsavel_id;
    if (resultingStatus === 'Ativo' && !resultingResponsavelId) {
      throw badRequest('Equipamentos com status Ativo precisam de um responsável.');
    }

    const fields = {
      patrimonio: 'patrimonio', tipoId: 'tipo_id', modelo: 'modelo', serial: 'serial',
      hostname: 'hostname', imei: 'imei', setorId: 'setor_id', fornecedorId: 'fornecedor_id',
      responsavelId: 'responsavel_id', status: 'status', dataAquisicao: 'data_aquisicao',
      dataGarantia: 'data_garantia', observacoes: 'observacoes',
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
    await query(`UPDATE equipamentos SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    const { rows } = await query(`${BASE_SELECT} WHERE e.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /equipamentos/bulk:
 *   patch:
 *     tags: [Equipamentos]
 *     summary: Ação em massa (transferir setor ou alterar status) sobre vários equipamentos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Quantidade de equipamentos afetados }
 */
router.patch(
  '/bulk',
  requireAuth,
  requirePermission('inventario', 'editar'),
  asyncHandler(async (req, res) => {
    const { ids, status, setorId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw badRequest('Informe a lista de IDs (ids).');

    const sets = [];
    const params = [];
    if (status) {
      params.push(status);
      sets.push(`status = $${params.length}`);
    }
    if (setorId !== undefined) {
      params.push(setorId || null);
      sets.push(`setor_id = $${params.length}`);
    }
    if (sets.length === 0) throw badRequest('Informe ao menos um campo para atualizar (status ou setorId).');

    // Equipamentos Ativos precisam de responsável: ao ativar em massa, só afeta
    // quem já tem um responsável vinculado — os demais devem ser editados individualmente.
    const responsavelGuard = status === 'Ativo' ? ' AND responsavel_id IS NOT NULL' : '';

    params.push(ids);
    const result = await query(
      `UPDATE equipamentos SET ${sets.join(', ')} WHERE id = ANY($${params.length}::int[]) AND deleted_at IS NULL${responsavelGuard}`,
      params
    );
    const skipped = status === 'Ativo' ? ids.length - result.rowCount : 0;
    res.json({ affected: result.rowCount, skipped });
  })
);

/**
 * @openapi
 * /equipamentos/{id}/foto:
 *   post:
 *     tags: [Equipamentos]
 *     summary: Upload da foto do equipamento (multipart/form-data, campo "foto")
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto: { type: string, format: binary }
 *     responses:
 *       200: { description: URL da foto salva }
 */
router.post(
  '/:id/foto',
  requireAuth,
  requirePermission('inventario', 'editar'),
  upload.single('foto'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Envie um arquivo no campo "foto".');
    const fotoUrl = `/uploads/${req.file.filename}`;
    await query(`UPDATE equipamentos SET foto_url = $1 WHERE id = $2`, [fotoUrl, req.params.id]);
    res.json({ fotoUrl });
  })
);

/**
 * @openapi
 * /equipamentos/{id}:
 *   delete:
 *     tags: [Equipamentos]
 *     summary: Remove (soft delete) um equipamento
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Removido }
 */
router.delete(
  '/:id',
  requireAuth,
  requirePermission('inventario', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE equipamentos SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [
      req.params.id,
    ]);
    if (result.rowCount === 0) throw notFound('Equipamento');
    res.status(204).send();
  })
);

export default router;
