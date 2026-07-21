import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

/**
 * Catálogo de empresas (TI / Geotecnologia) — usado pela tela de Acessos
 * para montar os checkboxes de "quais empresas este usuário pode acessar".
 * Só quem pode ver/gerenciar Acessos precisa desta lista completa; o
 * próprio usuário já recebe as empresas às quais tem acesso em /auth/me.
 */
router.get(
  '/',
  requireAuth,
  requirePermission('acessos', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT id, nome, slug, ativo FROM empresas WHERE ativo = TRUE ORDER BY nome`);
    res.json({ data: rows });
  })
);

export default router;
