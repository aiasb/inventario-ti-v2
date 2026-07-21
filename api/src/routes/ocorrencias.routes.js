import { Router } from 'express';
import { query, pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest, forbidden } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission, requireEmpresa } from '../middleware/auth.js';

const router = Router();

const STATUS_VALUES = ['Em Aberto', 'Enviado', 'Em Analise', 'Finalizado', 'Recusado'];

// Ocorrências Finalizadas ou Recusadas/Condenadas viram somente leitura —
// a exclusão continua disponível (ver DELETE), mas edição de campos/itens
// e mudança de status ficam bloqueadas a partir daqui.
function isLocked(status) {
  return status === 'Finalizado' || status === 'Recusado';
}

const BASE_SELECT = `
  SELECT o.id, o.numero, o.nota_fiscal, o.status, o.data, o.observacoes, o.created_at, o.updated_at,
         t.id AS transportadora_id, t.nome AS transportadora_nome,
         f.id AS fornecedor_id, f.nome AS fornecedor_nome,
         COALESCE(
           (SELECT json_agg(json_build_object(
              'id', oi.id,
              'radioId', oi.radio_id,
              'numeroSerie', r.numero_serie,
              'modelo', r.modelo,
              'numeroOs', oi.numero_os,
              'solicitante', oi.solicitante
            ) ORDER BY oi.id)
            FROM ocorrencia_itens oi
            JOIN radios r ON r.id = oi.radio_id
            WHERE oi.ocorrencia_id = o.id),
           '[]'
         ) AS itens
  FROM ocorrencias o
  LEFT JOIN transportadoras t ON t.id = o.transportadora_id
  LEFT JOIN fornecedores_geo f ON f.id = o.fornecedor_id
`;

function mapRow(r) {
  return {
    id: r.id,
    numero: r.numero,
    transportadora: r.transportadora_id ? { id: r.transportadora_id, nome: r.transportadora_nome } : null,
    fornecedor: r.fornecedor_id ? { id: r.fornecedor_id, nome: r.fornecedor_nome } : null,
    notaFiscal: r.nota_fiscal,
    status: r.status,
    data: r.data,
    observacoes: r.observacoes,
    itens: r.itens || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SORT_COLUMNS = {
  numero: 'o.numero', status: 'o.status', data: 'o.data', updatedAt: 'o.updated_at',
};

async function nextNumero() {
  const { rows } = await query(`SELECT numero FROM ocorrencias ORDER BY id DESC LIMIT 1`);
  const last = rows[0]?.numero;
  const n = last ? parseInt(last.replace('OC-', ''), 10) + 1 : 1;
  return `OC-${String(n).padStart(4, '0')}`;
}

router.get(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('ocorrencias', 'ver'),
  asyncHandler(async (req, res) => {
    const { status, transportadoraId, fornecedorId, q } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'o.data DESC'.split(' ')[0]);

    const conditions = ['o.deleted_at IS NULL'];
    const params = [];
    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (transportadoraId) {
      params.push(transportadoraId);
      conditions.push(`o.transportadora_id = $${params.length}`);
    }
    if (fornecedorId) {
      params.push(fornecedorId);
      conditions.push(`o.fornecedor_id = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(o.numero ILIKE $${idx} OR o.nota_fiscal ILIKE $${idx} OR t.nome ILIKE $${idx} OR f.nome ILIKE $${idx})`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM ocorrencias o LEFT JOIN transportadoras t ON t.id = o.transportadora_id LEFT JOIN fornecedores_geo f ON f.id = o.fornecedor_id ${where}`,
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
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('ocorrencias', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE o.id = $1 AND o.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Ocorrência');
    res.json(mapRow(rows[0]));
  })
);

function validarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw badRequest('Informe ao menos um ativo (rádio) vinculado à ocorrência.');
  }
  for (const item of itens) {
    if (!item.radioId) throw badRequest('Cada item precisa de um radioId.');
  }
}

router.post(
  '/',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('ocorrencias', 'criar'),
  asyncHandler(async (req, res) => {
    const { transportadoraId, fornecedorId, notaFiscal, data, observacoes, itens, status } = req.body;
    validarItens(itens);
    if (status && !STATUS_VALUES.includes(status)) throw badRequest('Status inválido.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const numero = await nextNumero();
      const { rows } = await client.query(
        `INSERT INTO ocorrencias (numero, transportadora_id, fornecedor_id, nota_fiscal, status, data, observacoes)
         VALUES ($1,$2,$3,$4,COALESCE($5,'Em Aberto'),COALESCE($6,CURRENT_DATE),$7) RETURNING id`,
        [numero, transportadoraId || null, fornecedorId || null, notaFiscal || null, status || null, data || null, observacoes || null]
      );
      const ocorrenciaId = rows[0].id;
      for (const item of itens) {
        await client.query(
          `INSERT INTO ocorrencia_itens (ocorrencia_id, radio_id, numero_os, solicitante) VALUES ($1,$2,$3,$4)`,
          [ocorrenciaId, item.radioId, item.numeroOs || null, item.solicitante || null]
        );
      }
      await client.query('COMMIT');

      const { rows: created } = await query(`${BASE_SELECT} WHERE o.id = $1`, [ocorrenciaId]);
      res.status(201).json(mapRow(created[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

router.put(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('ocorrencias', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT status FROM ocorrencias WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Ocorrência');
    if (isLocked(existing.rows[0].status)) {
      throw forbidden('Ocorrência finalizada ou recusada/condenada não pode ser editada.');
    }

    const { itens } = req.body;
    if (itens !== undefined) validarItens(itens);
    if (req.body.status && !STATUS_VALUES.includes(req.body.status)) throw badRequest('Status inválido.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fields = {
        transportadoraId: 'transportadora_id', fornecedorId: 'fornecedor_id', notaFiscal: 'nota_fiscal',
        status: 'status', data: 'data', observacoes: 'observacoes',
      };
      const sets = [];
      const params = [];
      for (const [key, column] of Object.entries(fields)) {
        if (req.body[key] !== undefined) {
          params.push(req.body[key] === '' ? null : req.body[key]);
          sets.push(`${column} = $${params.length}`);
        }
      }
      if (sets.length > 0) {
        params.push(req.params.id);
        await client.query(`UPDATE ocorrencias SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
      }
      if (Array.isArray(itens)) {
        await client.query(`DELETE FROM ocorrencia_itens WHERE ocorrencia_id = $1`, [req.params.id]);
        for (const item of itens) {
          await client.query(
            `INSERT INTO ocorrencia_itens (ocorrencia_id, radio_id, numero_os, solicitante) VALUES ($1,$2,$3,$4)`,
            [req.params.id, item.radioId, item.numeroOs || null, item.solicitante || null]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query(`${BASE_SELECT} WHERE o.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

router.patch(
  '/:id/status',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('ocorrencias', 'editar'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!STATUS_VALUES.includes(status)) throw badRequest('Status inválido.');

    const existing = await query(`SELECT status FROM ocorrencias WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Ocorrência');
    if (isLocked(existing.rows[0].status)) {
      throw forbidden('Ocorrência finalizada ou recusada/condenada não pode ser editada.');
    }

    await query(`UPDATE ocorrencias SET status = $1 WHERE id = $2`, [status, req.params.id]);
    const { rows } = await query(`${BASE_SELECT} WHERE o.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireEmpresa('geotecnologia'),
  requirePermission('ocorrencias', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE ocorrencias SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Ocorrência');
    res.status(204).send();
  })
);

export default router;
