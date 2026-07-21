import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission, requireEmpresa } from '../middleware/auth.js';
import { formatDateBR } from '../utils/formatDate.js';
import { renderTabularPdf } from '../utils/relatoriosPdf.js';

const router = Router();

const BASE_SELECT = `
  SELECT r.id, r.numero_serie, r.modelo, r.status, r.id_digital, r.id_analogico,
         r.data_aquisicao, r.observacoes, r.created_at, r.updated_at,
         f.id AS frota_id, f.numero AS frota_numero, f.nome AS frota_nome,
         a.id AS area_id, a.nome AS area_nome,
         resp.id AS responsavel_id, resp.nome AS responsavel_nome
  FROM radios r
  LEFT JOIN frotas f ON f.id = r.frota_id
  LEFT JOIN areas_geo a ON a.id = r.area_id
  LEFT JOIN responsaveis_geo resp ON resp.id = r.responsavel_id
`;

function mapRow(r) {
  return {
    id: r.id,
    numeroSerie: r.numero_serie,
    modelo: r.modelo,
    status: r.status,
    idDigital: r.id_digital,
    idAnalogico: r.id_analogico,
    dataAquisicao: r.data_aquisicao,
    observacoes: r.observacoes,
    frota: r.frota_id ? { id: r.frota_id, numero: r.frota_numero, nome: r.frota_nome } : null,
    area: r.area_id ? { id: r.area_id, nome: r.area_nome } : null,
    responsavel: r.responsavel_id ? { id: r.responsavel_id, nome: r.responsavel_nome } : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SORT_COLUMNS = {
  numeroSerie: 'r.numero_serie',
  modelo: 'r.modelo',
  status: 'r.status',
  frota: 'f.nome',
  area: 'a.nome',
  responsavel: 'resp.nome',
  dataAquisicao: 'r.data_aquisicao',
  updatedAt: 'r.updated_at',
};

function buildRadiosFilters(qs) {
  const { status, frotaId, areaId, responsavelId, q, numeroSerie, id, dataInicio, dataFim } = qs;
  const conditions = ['r.deleted_at IS NULL'];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (frotaId) {
    params.push(frotaId);
    conditions.push(`r.frota_id = $${params.length}`);
  }
  if (areaId) {
    params.push(areaId);
    conditions.push(`r.area_id = $${params.length}`);
  }
  if (responsavelId) {
    params.push(responsavelId);
    conditions.push(`r.responsavel_id = $${params.length}`);
  }
  if (numeroSerie) {
    params.push(`%${numeroSerie}%`);
    conditions.push(`r.numero_serie ILIKE $${params.length}`);
  }
  if (id) {
    params.push(`%${id}%`);
    const idx = params.length;
    conditions.push(`(r.id_digital ILIKE $${idx} OR r.id_analogico ILIKE $${idx})`);
  }
  if (dataInicio) {
    params.push(dataInicio);
    conditions.push(`r.data_aquisicao >= $${params.length}`);
  }
  if (dataFim) {
    params.push(dataFim);
    conditions.push(`r.data_aquisicao <= $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(
      `(r.numero_serie ILIKE $${idx} OR r.modelo ILIKE $${idx} OR resp.nome ILIKE $${idx})`
    );
  }

  return { conditions, params };
}

router.get(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'ver'),
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'r.updated_at DESC'.split(' ')[0]);

    const { conditions, params } = buildRadiosFilters(req.query);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM radios r LEFT JOIN responsaveis_geo resp ON resp.id = r.responsavel_id ${where}`,
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

router.get(
  '/export/pdf',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'ver'),
  asyncHandler(async (req, res) => {
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'r.numero_serie'.split(' ')[0]);
    const { conditions, params } = buildRadiosFilters(req.query);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows } = await query(`${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT 5000`, params);
    const data = rows.map(mapRow);

    const buffer = await renderTabularPdf({
      title: 'Relatório de Rádios',
      subtitle: `Gerado em ${new Date().toLocaleString('pt-BR')} · ${data.length} registro(s)`,
      columns: [
        { label: 'Nº Série', value: (r) => r.numeroSerie, weight: 1.2 },
        { label: 'Modelo', value: (r) => r.modelo, weight: 1.3 },
        { label: 'ID Digital', value: (r) => r.idDigital, weight: 1 },
        { label: 'ID Analógico', value: (r) => r.idAnalogico, weight: 1 },
        { label: 'Frota', value: (r) => (r.frota ? `${r.frota.numero} · ${r.frota.nome}` : ''), weight: 1.3 },
        { label: 'Área', value: (r) => r.area?.nome, weight: 1.1 },
        { label: 'Responsável', value: (r) => r.responsavel?.nome, weight: 1.2 },
        { label: 'Status', value: (r) => r.status, weight: 0.9 },
        { label: 'Aquisição', value: (r) => formatDateBR(r.dataAquisicao), weight: 0.9 },
      ],
      rows: data,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-radios.pdf"');
    res.send(buffer);
  })
);

router.get(
  '/sync',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'ver'),
  asyncHandler(async (req, res) => {
    const { updated_since: updatedSince } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (updatedSince) {
      params.push(updatedSince);
      where += ` AND r.updated_at >= $${params.length}`;
    }
    const { rows } = await query(`${BASE_SELECT} ${where} ORDER BY r.updated_at ASC LIMIT 1000`, params);
    res.json({ data: rows.map(mapRow), syncedAt: new Date().toISOString() });
  })
);

router.get(
  '/serial/:numeroSerie',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE r.numero_serie = $1 AND r.deleted_at IS NULL`, [
      req.params.numeroSerie,
    ]);
    if (!rows[0]) throw notFound('Rádio');
    res.json(mapRow(rows[0]));
  })
);

router.get(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE r.id = $1 AND r.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Rádio');

    const { rows: manutencoes } = await query(
      `SELECT id, os, titulo, tipo, tecnico, custo, data, status FROM manutencoes_radios
       WHERE radio_id = $1 AND deleted_at IS NULL ORDER BY data DESC`,
      [req.params.id]
    );

    res.json({ ...mapRow(rows[0]), manutencoes });
  })
);

function validateRadioBody(body, { partial = false } = {}) {
  const required = ['numeroSerie'];
  if (!partial) {
    for (const field of required) {
      if (!body[field]) throw badRequest(`Campo obrigatório ausente: ${field}`);
    }
  }
}

router.post(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'criar'),
  asyncHandler(async (req, res) => {
    validateRadioBody(req.body);
    const {
      numeroSerie, modelo, frotaId, areaId, responsavelId, status, dataAquisicao, observacoes,
      idDigital, idAnalogico,
    } = req.body;

    const { rows } = await query(
      `INSERT INTO radios
        (numero_serie, modelo, frota_id, area_id, responsavel_id, status, data_aquisicao, observacoes, id_digital, id_analogico)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'Ativo'),$7,$8,$9,$10)
       RETURNING id`,
      [numeroSerie, modelo || null, frotaId || null, areaId || null, responsavelId || null,
       status || null, dataAquisicao || null, observacoes || null, idDigital || null, idAnalogico || null]
    );

    const { rows: created } = await query(`${BASE_SELECT} WHERE r.id = $1`, [rows[0].id]);
    res.status(201).json(mapRow(created[0]));
  })
);

router.put(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM radios WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Rádio');

    validateRadioBody(req.body, { partial: true });

    const fields = {
      numeroSerie: 'numero_serie', modelo: 'modelo', frotaId: 'frota_id', areaId: 'area_id',
      responsavelId: 'responsavel_id', status: 'status', dataAquisicao: 'data_aquisicao',
      observacoes: 'observacoes', idDigital: 'id_digital', idAnalogico: 'id_analogico',
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
    await query(`UPDATE radios SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    const { rows } = await query(`${BASE_SELECT} WHERE r.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

router.patch(
  '/bulk',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'editar'),
  asyncHandler(async (req, res) => {
    const { ids, status, frotaId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw badRequest('Informe a lista de IDs (ids).');

    const sets = [];
    const params = [];
    if (status) {
      params.push(status);
      sets.push(`status = $${params.length}`);
    }
    if (frotaId !== undefined) {
      params.push(frotaId || null);
      sets.push(`frota_id = $${params.length}`);
    }
    if (sets.length === 0) throw badRequest('Informe ao menos um campo para atualizar (status ou frotaId).');

    params.push(ids);
    const result = await query(
      `UPDATE radios SET ${sets.join(', ')} WHERE id = ANY($${params.length}::int[]) AND deleted_at IS NULL`,
      params
    );
    res.json({ affected: result.rowCount });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('radios', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE radios SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [
      req.params.id,
    ]);
    if (result.rowCount === 0) throw notFound('Rádio');
    res.status(204).send();
  })
);

export default router;
