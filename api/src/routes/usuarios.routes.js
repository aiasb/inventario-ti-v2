import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

const BASE_SELECT = `SELECT u.*, p.nome AS perfil_nome FROM usuarios u JOIN perfis p ON p.id = u.perfil_id`;

function mapRow(r) {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    cargo: r.cargo,
    perfil: r.perfil_nome,
    perfilId: r.perfil_id,
    ativo: r.ativo,
    bloqueado: r.bloqueado,
    ultimoAcesso: r.ultimo_acesso,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function resolvePerfilId(perfilId) {
  if (perfilId === undefined) return undefined;
  const { rows } = await query(`SELECT id FROM perfis WHERE id = $1 AND deleted_at IS NULL`, [perfilId]);
  if (!rows[0]) throw badRequest('Perfil inválido.');
  return rows[0].id;
}

async function defaultPerfilId() {
  const { rows } = await query(`SELECT id FROM perfis WHERE nome = 'Consulta' AND deleted_at IS NULL LIMIT 1`);
  return rows[0]?.id ?? null;
}

const SORT_COLUMNS = { nome: 'u.nome', email: 'u.email', perfil: 'p.nome', ultimoAcesso: 'u.ultimo_acesso' };

router.get(
  '/',
  requireAuth,
  requirePermission('acessos', 'ver'),
  asyncHandler(async (req, res) => {
    const { q, perfilId, ativo } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 'u.nome');

    const conditions = ['u.deleted_at IS NULL'];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(u.nome ILIKE $${idx} OR u.email ILIKE $${idx})`);
    }
    if (perfilId) {
      params.push(perfilId);
      conditions.push(`u.perfil_id = $${params.length}`);
    }
    if (ativo !== undefined) {
      params.push(ativo === 'true');
      conditions.push(`u.ativo = $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM usuarios u ${where}`, params);
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
  requirePermission('acessos', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE u.id = $1 AND u.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Usuário');
    res.json(mapRow(rows[0]));
  })
);

router.post(
  '/',
  requireAuth,
  requirePermission('acessos', 'criar'),
  asyncHandler(async (req, res) => {
    const { nome, email, senha, cargo, perfilId } = req.body;
    if (!nome || !email || !senha) throw badRequest('Campos obrigatórios: nome, email, senha.');
    const resolvedPerfilId = (await resolvePerfilId(perfilId)) ?? (await defaultPerfilId());
    if (!resolvedPerfilId) throw badRequest('Nenhum perfil de acesso disponível. Crie um perfil antes de cadastrar usuários.');

    const senhaHash = await bcrypt.hash(senha, 10);
    const { rows } = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, cargo, perfil_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [nome, email.toLowerCase().trim(), senhaHash, cargo || null, resolvedPerfilId]
    );
    const { rows: created } = await query(`${BASE_SELECT} WHERE u.id = $1`, [rows[0].id]);
    res.status(201).json(mapRow(created[0]));
  })
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('acessos', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM usuarios WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Usuário');

    const { nome, email, senha, cargo, perfilId, ativo } = req.body;
    const resolvedPerfilId = await resolvePerfilId(perfilId);

    const sets = [];
    const params = [];
    const push = (col, val) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (nome !== undefined) push('nome', nome);
    if (email !== undefined) push('email', email.toLowerCase().trim());
    if (cargo !== undefined) push('cargo', cargo || null);
    if (resolvedPerfilId !== undefined) push('perfil_id', resolvedPerfilId);
    if (ativo !== undefined) push('ativo', ativo);
    if (senha) push('senha_hash', await bcrypt.hash(senha, 10));

    if (sets.length === 0) throw badRequest('Nenhum campo para atualizar.');
    params.push(req.params.id);
    await query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    const { rows } = await query(`${BASE_SELECT} WHERE u.id = $1`, [req.params.id]);
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /usuarios/{id}/status:
 *   patch:
 *     tags: [Usuários]
 *     summary: Ativa ou desativa o acesso de um usuário
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status atualizado }
 */
router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('acessos', 'editar'),
  asyncHandler(async (req, res) => {
    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') throw badRequest('Informe "ativo" como booleano.');
    const { rows } = await query(`UPDATE usuarios SET ativo = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`, [
      ativo, req.params.id,
    ]);
    if (!rows[0]) throw notFound('Usuário');
    res.json(mapRow(rows[0]));
  })
);

/**
 * @openapi
 * /usuarios/{id}/bloqueio:
 *   patch:
 *     tags: [Usuários]
 *     summary: Bloqueia ou desbloqueia a conta de um usuário (distinto de ativar/desativar)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Bloqueio atualizado }
 */
router.patch(
  '/:id/bloqueio',
  requireAuth,
  requirePermission('acessos', 'editar'),
  asyncHandler(async (req, res) => {
    const { bloqueado } = req.body;
    if (typeof bloqueado !== 'boolean') throw badRequest('Informe "bloqueado" como booleano.');
    const { rows } = await query(`UPDATE usuarios SET bloqueado = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *`, [
      bloqueado, req.params.id,
    ]);
    if (!rows[0]) throw notFound('Usuário');
    res.json(mapRow(rows[0]));
  })
);

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * @openapi
 * /usuarios/{id}/resetar-senha:
 *   post:
 *     tags: [Usuários]
 *     summary: Gera uma senha temporária aleatória para o usuário (exibida em texto puro apenas nesta resposta)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Senha temporária gerada }
 */
router.post(
  '/:id/resetar-senha',
  requireAuth,
  requirePermission('acessos', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM usuarios WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Usuário');

    const senhaTemporaria = generateTempPassword();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);
    await query(`UPDATE usuarios SET senha_hash = $1 WHERE id = $2`, [senhaHash, req.params.id]);
    res.json({ senhaTemporaria });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('acessos', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE usuarios SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Usuário');
    res.status(204).send();
  })
);

export default router;
