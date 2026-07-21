import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission, requireEmpresa } from '../middleware/auth.js';
import { formatDateBR } from '../utils/formatDate.js';
import { renderTabularPdf } from '../utils/relatoriosPdf.js';

const router = Router();

const JOINS = `
  FROM manutencoes_radios m
  LEFT JOIN radios r ON r.id = m.radio_id
  LEFT JOIN frotas fr ON fr.id = m.frota_id
`;

const BASE_SELECT = `
  SELECT m.id, m.os, m.titulo, m.tipo, m.tecnico, m.custo, m.descricao, m.data, m.status,
         m.created_at, m.updated_at,
         r.id AS radio_id, r.numero_serie, r.modelo,
         fr.id AS frota_id, fr.numero AS frota_numero, fr.nome AS frota_nome,
         COALESCE(
           (SELECT json_agg(json_build_object('id', i.id, 'nome', i.nome) ORDER BY i.nome)
            FROM manutencoes_radios_insumos mri
            JOIN insumos i ON i.id = mri.insumo_id
            WHERE mri.manutencao_radio_id = m.id),
           '[]'
         ) AS insumos
  ${JOINS}
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
    radio: r.radio_id ? { id: r.radio_id, numeroSerie: r.numero_serie, modelo: r.modelo } : null,
    frota: r.frota_id ? { id: r.frota_id, numero: r.frota_numero, nome: r.frota_nome } : null,
    insumos: r.insumos || [],
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

function buildManutencaoFilters(qs) {
  const { status, tipo, radioId, frotaId, q, id, serial, dataInicio, dataFim } = qs;
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
  if (frotaId) {
    // A frota pode estar tanto na OS diretamente (aberta "por frota") quanto no
    // rádio vinculado (OS aberta "por rádio" pertencente a essa frota).
    params.push(frotaId);
    conditions.push(`(m.frota_id = $${params.length} OR r.frota_id = $${params.length})`);
  }
  if (id) {
    params.push(`%${id}%`);
    const idx = params.length;
    conditions.push(`(r.id_digital ILIKE $${idx} OR r.id_analogico ILIKE $${idx})`);
  }
  if (serial) {
    params.push(`%${serial}%`);
    conditions.push(`r.numero_serie ILIKE $${params.length}`);
  }
  if (dataInicio) {
    params.push(dataInicio);
    conditions.push(`m.data >= $${params.length}`);
  }
  if (dataFim) {
    params.push(dataFim);
    conditions.push(`m.data <= $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(m.os ILIKE $${idx} OR m.titulo ILIKE $${idx} OR r.numero_serie ILIKE $${idx} OR fr.numero ILIKE $${idx} OR fr.nome ILIKE $${idx})`);
  }

  return { conditions, params };
}

router.get(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('manutencoesRadios', 'ver'),
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'm.data DESC'.split(' ')[0]);

    const { conditions, params } = buildManutencaoFilters(req.query);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(`SELECT COUNT(*) ${JOINS} ${where}`, params);
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
  requirePermission('manutencoesRadios', 'ver'),
  asyncHandler(async (req, res) => {
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'm.data DESC'.split(' ')[0]);
    const { conditions, params } = buildManutencaoFilters(req.query);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows } = await query(`${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT 5000`, params);
    const data = rows.map(mapRow);

    const buffer = await renderTabularPdf({
      title: 'Relatório de Manutenções (Rádios)',
      subtitle: `Gerado em ${new Date().toLocaleString('pt-BR')} · ${data.length} registro(s)`,
      columns: [
        { label: 'OS', value: (m) => m.os, weight: 0.9 },
        { label: 'Rádio / Frota', value: (m) => (m.radio ? m.radio.numeroSerie : m.frota ? `Frota ${m.frota.numero}` : ''), weight: 1.1 },
        { label: 'Defeito', value: (m) => m.titulo, weight: 1.8 },
        { label: 'Tipo', value: (m) => m.tipo, weight: 0.8 },
        { label: 'Técnico', value: (m) => m.tecnico, weight: 1 },
        { label: 'Data', value: (m) => formatDateBR(m.data), weight: 0.8 },
        { label: 'Status', value: (m) => m.status, weight: 0.9 },
        { label: 'Insumos', value: (m) => m.insumos.map((i) => i.nome).join(', '), weight: 1.3 },
      ],
      rows: data,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-manutencoes-radios.pdf"');
    res.send(buffer);
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
    const { radioId, frotaId, titulo, tipo, tecnico, custo, descricao, data, status } = req.body;
    if ((!radioId && !frotaId) || !titulo || !tipo) {
      throw badRequest('Campos obrigatórios: radioId ou frotaId, titulo (defeito), tipo.');
    }

    // O(s) insumo(s) usado(s) só são escolhidos no fechamento da OS (ver PATCH /:id/status).
    const os = await nextOsNumber();
    const { rows } = await query(
      `INSERT INTO manutencoes_radios (os, radio_id, frota_id, titulo, tipo, tecnico, custo, descricao, data, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,CURRENT_DATE),COALESCE($10,'Aberta')) RETURNING id`,
      [os, radioId || null, frotaId || null, titulo, tipo, tecnico || null, custo || 0, descricao || null, data || null, status || null]
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

    const fields = {
      titulo: 'titulo', tipo: 'tipo', tecnico: 'tecnico', custo: 'custo',
      descricao: 'descricao', data: 'data', status: 'status', radioId: 'radio_id', frotaId: 'frota_id',
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
    const { status, insumoIds } = req.body;
    if (!['Aberta', 'Em andamento', 'Concluida'].includes(status)) throw badRequest('Status inválido.');

    const existing = await query(`SELECT id FROM manutencoes_radios WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Manutenção');

    const { rows: linkedRows } = await query(
      `SELECT insumo_id FROM manutencoes_radios_insumos WHERE manutencao_radio_id = $1`,
      [req.params.id]
    );

    if (status === 'Concluida' && linkedRows.length === 0) {
      const ids = Array.isArray(insumoIds) ? [...new Set(insumoIds)] : [];
      if (ids.length === 0) throw badRequest('Informe ao menos um insumo utilizado para concluir a OS.');
      const { rows: validRows } = await query(
        `SELECT id FROM insumos WHERE id = ANY($1::int[]) AND deleted_at IS NULL`,
        [ids]
      );
      if (validRows.length !== ids.length) throw badRequest('Insumo inválido.');
      for (const insumoId of ids) {
        await query(
          `INSERT INTO manutencoes_radios_insumos (manutencao_radio_id, insumo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.params.id, insumoId]
        );
      }
    }

    const result = await query(
      `UPDATE manutencoes_radios SET status = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [status, req.params.id]
    );
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
