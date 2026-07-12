import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

const modelosDir = path.resolve(config.privateFilesDir, 'termo-modelos');
fs.mkdirSync(modelosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, modelosDir),
  filename: (req, file, cb) => cb(null, `modelo-${req.params.id}-${Date.now()}.docx`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isDocx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.toLowerCase().endsWith('.docx');
    if (!isDocx) return cb(badRequest('Envie um arquivo .docx (Word).'));
    cb(null, true);
  },
});

function mapRow(r) {
  return {
    id: r.id,
    nome: r.nome,
    texto: r.texto,
    arquivoNome: r.arquivo_nome,
    temArquivo: !!r.arquivo_path,
    ativo: r.ativo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

router.get(
  '/',
  requireAuth,
  requirePermission('termos', 'ver'),
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`nome ILIKE $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM termo_modelos ${where}`, params);
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT * FROM termo_modelos ${where} ORDER BY nome ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(paginatedResponse({ data: rows.map(mapRow), total, page, limit }));
  })
);

router.get(
  '/:id',
  requireAuth,
  requirePermission('termos', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM termo_modelos WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Modelo de termo');
    res.json(mapRow(rows[0]));
  })
);

router.post(
  '/',
  requireAuth,
  requirePermission('termos', 'criar'),
  asyncHandler(async (req, res) => {
    const { nome, texto } = req.body;
    if (!nome) throw badRequest('Informe o nome do modelo.');
    const { rows } = await query(
      `INSERT INTO termo_modelos (nome, texto) VALUES ($1, $2) RETURNING *`,
      [nome, texto || null]
    );
    res.status(201).json(mapRow(rows[0]));
  })
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('termos', 'editar'),
  asyncHandler(async (req, res) => {
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries({ nome: 'nome', texto: 'texto', ativo: 'ativo' })) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key] === '' ? null : req.body[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw badRequest('Nenhum campo para atualizar.');
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE termo_modelos SET ${sets.join(', ')} WHERE id = $${params.length} AND deleted_at IS NULL RETURNING *`,
      params
    );
    if (!rows[0]) throw notFound('Modelo de termo');
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /termo-modelos/{id}/arquivo:
 *   post:
 *     tags: [Termos]
 *     summary: Envia o arquivo .docx do modelo (mantém a formatação original)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               arquivo: { type: string, format: binary }
 *     responses:
 *       200: { description: Arquivo salvo }
 */
router.post(
  '/:id/arquivo',
  requireAuth,
  requirePermission('termos', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT * FROM termo_modelos WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Modelo de termo');

    await new Promise((resolve, reject) => {
      upload.single('arquivo')(req, res, (err) => (err ? reject(err) : resolve()));
    });
    if (!req.file) throw badRequest('Envie um arquivo no campo "arquivo".');

    const oldPath = existing.rows[0].arquivo_path;
    const { rows } = await query(
      `UPDATE termo_modelos SET arquivo_path = $1, arquivo_nome = $2 WHERE id = $3 RETURNING *`,
      [req.file.path, req.file.originalname, req.params.id]
    );
    if (oldPath && oldPath !== req.file.path) {
      fs.unlink(oldPath, () => {});
    }
    res.json(mapRow(rows[0]));
  })
);

router.delete(
  '/:id/arquivo',
  requireAuth,
  requirePermission('termos', 'editar'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT arquivo_path FROM termo_modelos WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Modelo de termo');
    if (rows[0].arquivo_path) fs.unlink(rows[0].arquivo_path, () => {});
    const { rows: updated } = await query(
      `UPDATE termo_modelos SET arquivo_path = NULL, arquivo_nome = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(mapRow(updated[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('termos', 'excluir'),
  asyncHandler(async (req, res) => {
    try {
      const result = await query(`UPDATE termo_modelos SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (result.rowCount === 0) throw notFound('Modelo de termo');
    } catch (err) {
      if (err.code === '23503') throw conflict('Este modelo está em uso por um ou mais termos e não pode ser removido.');
      throw err;
    }
    res.status(204).send();
  })
);

export default router;
