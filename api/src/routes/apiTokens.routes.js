import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { generateApiToken } from '../utils/jwt.js';

const router = Router();

function mapRow(r) {
  return {
    id: r.id,
    nome: r.nome,
    tokenPrefix: r.token_prefix,
    revoked: r.revoked,
    ultimoUso: r.ultimo_uso,
    criadoPor: r.criado_por,
    createdAt: r.created_at,
  };
}

/**
 * @openapi
 * /api-tokens:
 *   get:
 *     tags: [Integrações]
 *     summary: Lista tokens de API emitidos para o app Android
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tokens }
 */
router.get(
  '/',
  requireAuth,
  requirePermission('configuracoes', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM api_tokens ORDER BY created_at DESC`);
    res.json({ data: rows.map(mapRow) });
  })
);

/**
 * @openapi
 * /api-tokens:
 *   post:
 *     tags: [Integrações]
 *     summary: Gera um novo token de API (exibido em texto puro apenas nesta resposta)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Token criado }
 */
router.post(
  '/',
  requireAuth,
  requirePermission('configuracoes', 'criar'),
  asyncHandler(async (req, res) => {
    const { nome } = req.body;
    if (!nome) throw badRequest('Informe um nome/descrição para o token.');
    const { raw, prefix, hash } = generateApiToken();
    const { rows } = await query(
      `INSERT INTO api_tokens (nome, token_prefix, token_hash, criado_por) VALUES ($1,$2,$3,$4) RETURNING *`,
      [nome, prefix, hash, req.user.id || null]
    );
    res.status(201).json({ ...mapRow(rows[0]), token: raw });
  })
);

/**
 * @openapi
 * /api-tokens/{id}/revoke:
 *   patch:
 *     tags: [Integrações]
 *     summary: Revoga um token de API
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Token revogado }
 */
router.patch(
  '/:id/revoke',
  requireAuth,
  requirePermission('configuracoes', 'editar'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`UPDATE api_tokens SET revoked = TRUE WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!rows[0]) throw notFound('Token');
    res.json(mapRow(rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('configuracoes', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`DELETE FROM api_tokens WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Token');
    res.status(204).send();
  })
);

export default router;
