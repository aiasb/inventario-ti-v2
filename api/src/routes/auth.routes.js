import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyToken, hashToken } from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

function sanitizeUser(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    perfil: u.perfil_nome,
    perfilId: u.perfil_id,
    ativo: u.ativo,
    ultimoAcesso: u.ultimo_acesso,
  };
}

async function loadPermissoesMap(perfilId) {
  const { rows } = await query(`SELECT * FROM perfil_permissoes WHERE perfil_id = $1`, [perfilId]);
  const permissoes = {};
  for (const r of rows) {
    permissoes[r.modulo] = {
      podeVer: r.pode_ver, podeCriar: r.pode_criar, podeEditar: r.pode_editar, podeExcluir: r.pode_excluir,
    };
  }
  return permissoes;
}

async function loadEmpresas(usuarioId) {
  const { rows } = await query(
    `SELECT e.id, e.nome, e.slug FROM usuario_empresas ue
     JOIN empresas e ON e.id = ue.empresa_id
     WHERE ue.usuario_id = $1 AND e.ativo = TRUE ORDER BY e.nome`,
    [usuarioId]
  );
  return rows.map((r) => ({ id: r.id, nome: r.nome, slug: r.slug }));
}

const USER_SELECT = `
  SELECT u.*, p.nome AS perfil_nome
  FROM usuarios u
  JOIN perfis p ON p.id = u.perfil_id
`;

function refreshExpiryDate() {
  const days = parseInt((config.jwt.refreshExpiresIn || '30d').replace('d', ''), 10) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Login por e-mail e senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email: { type: string }
 *               senha: { type: string }
 *     responses:
 *       200: { description: Login efetuado com sucesso }
 *       401: { description: Credenciais inválidas }
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) throw badRequest('Informe e-mail e senha.');

    const { rows } = await query(
      `${USER_SELECT} WHERE u.email = $1 AND u.deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user || !user.ativo) throw unauthorized('E-mail ou senha incorretos, ou usuário inativo.');
    if (user.bloqueado) throw unauthorized('Conta bloqueada. Entre em contato com um administrador.');

    const valid = await bcrypt.compare(senha, user.senha_hash);
    if (!valid) throw unauthorized('E-mail ou senha incorretos.');

    await query(`UPDATE usuarios SET ultimo_acesso = now() WHERE id = $1`, [user.id]);

    const accessToken = signAccessToken({ id: user.id, email: user.email, nome: user.nome, perfil: user.perfil_nome, perfilId: user.perfil_id });
    const refreshToken = signRefreshToken(user);
    await query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4)`,
      [user.id, hashToken(refreshToken), req.headers['user-agent'] || null, refreshExpiryDate()]
    );

    res.json({
      accessToken,
      refreshToken,
      usuario: {
        ...sanitizeUser(user),
        permissoes: await loadPermissoesMap(user.perfil_id),
        empresas: await loadEmpresas(user.id),
      },
    });
  })
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Autenticação]
 *     summary: Renova o access token a partir de um refresh token válido
 *     responses:
 *       200: { description: Novo par de tokens }
 *       401: { description: Refresh token inválido }
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw badRequest('Informe o refreshToken.');

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch {
      throw unauthorized('Refresh token inválido ou expirado.');
    }
    if (payload.type !== 'refresh') throw unauthorized('Token informado não é um refresh token.');

    const hash = hashToken(refreshToken);
    const { rows } = await query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND usuario_id = $2 LIMIT 1`,
      [hash, payload.sub]
    );
    const stored = rows[0];
    if (!stored || stored.revoked || new Date(stored.expires_at) < new Date()) {
      throw unauthorized('Refresh token inválido, revogado ou expirado.');
    }

    const { rows: userRows } = await query(
      `${USER_SELECT} WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`,
      [payload.sub]
    );
    const user = userRows[0];
    if (!user || !user.ativo) throw unauthorized('Usuário inválido ou inativo.');

    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [stored.id]);

    const accessToken = signAccessToken({ id: user.id, email: user.email, nome: user.nome, perfil: user.perfil_nome, perfilId: user.perfil_id });
    const newRefreshToken = signRefreshToken(user);
    await query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4)`,
      [user.id, hashToken(newRefreshToken), req.headers['user-agent'] || null, refreshExpiryDate()]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  })
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Autenticação]
 *     summary: Revoga um refresh token
 *     responses:
 *       204: { description: Sessão encerrada }
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [hashToken(refreshToken)]);
    }
    res.status(204).send();
  })
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Autenticação]
 *     summary: Retorna o usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuário atual }
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user.id) return res.json({ usuario: req.user });
    const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [req.user.id]);
    if (!rows[0]) throw unauthorized();
    res.json({
      usuario: {
        ...sanitizeUser(rows[0]),
        permissoes: await loadPermissoesMap(rows[0].perfil_id),
        empresas: await loadEmpresas(rows[0].id),
      },
    });
  })
);

export default router;
