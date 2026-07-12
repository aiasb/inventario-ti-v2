import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

/**
 * Fábrica de rotas CRUD para tabelas auxiliares simples (setores, filiais,
 * tipos_equipamento, fornecedores) que compartilham o mesmo formato:
 * id, nome (+ colunas extras opcionais), ativo, timestamps, soft delete.
 */
export function simpleCrudRouter({ table, columns, snakeToCamel, searchColumn = 'nome', modulo }) {
  const router = Router();
  const cols = ['id', ...columns, 'ativo', 'created_at', 'updated_at'];

  function mapRow(row) {
    const out = {};
    for (const c of cols) {
      out[snakeToCamel[c] || c] = row[c];
    }
    return out;
  }

  router.get(
    '/',
    requireAuth,
    requirePermission(modulo, 'ver'),
    asyncHandler(async (req, res) => {
      const { q, ativo } = req.query;
      const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
      const conditions = ['deleted_at IS NULL'];
      const params = [];
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`${searchColumn} ILIKE $${params.length}`);
      }
      if (ativo !== undefined) {
        params.push(ativo === 'true');
        conditions.push(`ativo = $${params.length}`);
      }
      const where = `WHERE ${conditions.join(' AND ')}`;
      const { rows: countRows } = await query(`SELECT COUNT(*) FROM ${table} ${where}`, params);
      const total = parseInt(countRows[0].count, 10);

      params.push(limit, offset);
      const { rows } = await query(
        `SELECT ${cols.join(', ')} FROM ${table} ${where} ORDER BY ${searchColumn} ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      res.json(paginatedResponse({ data: rows.map(mapRow), total, page, limit }));
    })
  );

  router.get(
    '/:id',
    requireAuth,
    requirePermission(modulo, 'ver'),
    asyncHandler(async (req, res) => {
      const { rows } = await query(`SELECT ${cols.join(', ')} FROM ${table} WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (!rows[0]) throw notFound();
      res.json(mapRow(rows[0]));
    })
  );

  router.post(
    '/',
    requireAuth,
    requirePermission(modulo, 'criar'),
    asyncHandler(async (req, res) => {
      const insertCols = columns.filter((c) => req.body[snakeToCamel[c] || c] !== undefined);
      if (insertCols.length === 0) throw badRequest('Nenhum campo informado.');
      const values = insertCols.map((c) => req.body[snakeToCamel[c] || c]);
      const placeholders = insertCols.map((_, i) => `$${i + 1}`);
      const { rows } = await query(
        `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${cols.join(', ')}`,
        values
      );
      res.status(201).json(mapRow(rows[0]));
    })
  );

  router.put(
    '/:id',
    requireAuth,
    requirePermission(modulo, 'editar'),
    asyncHandler(async (req, res) => {
      const existing = await query(`SELECT id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (!existing.rows[0]) throw notFound();

      const updatable = [...columns, 'ativo'];
      const sets = [];
      const params = [];
      for (const c of updatable) {
        const key = snakeToCamel[c] || c;
        if (req.body[key] !== undefined) {
          params.push(req.body[key] === '' ? null : req.body[key]);
          sets.push(`${c} = $${params.length}`);
        }
      }
      if (sets.length === 0) throw badRequest('Nenhum campo para atualizar.');
      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${cols.join(', ')}`,
        params
      );
      res.json(mapRow(rows[0]));
    })
  );

  router.delete(
    '/:id',
    requireAuth,
    requirePermission(modulo, 'excluir'),
    asyncHandler(async (req, res) => {
      try {
        const result = await query(`UPDATE ${table} SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
        if (result.rowCount === 0) throw notFound();
      } catch (err) {
        if (err.code === '23503') throw conflict('Este registro está em uso e não pode ser removido.');
        throw err;
      }
      res.status(204).send();
    })
  );

  return router;
}
