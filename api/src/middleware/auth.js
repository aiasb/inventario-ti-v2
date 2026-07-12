import { verifyToken, hashToken } from '../utils/jwt.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { query } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw unauthorized('Token de acesso ausente.');
  }

  // Token de API de longa duração (uso futuro pelo app Android)
  if (token.startsWith('iti_')) {
    const hash = hashToken(token);
    const { rows } = await query(
      `SELECT id, nome, revoked FROM api_tokens WHERE token_hash = $1 LIMIT 1`,
      [hash]
    );
    const apiToken = rows[0];
    if (!apiToken || apiToken.revoked) {
      throw unauthorized('Token de API inválido ou revogado.');
    }
    query(`UPDATE api_tokens SET ultimo_uso = now() WHERE id = $1`, [apiToken.id]).catch(() => {});
    req.user = { id: null, nome: apiToken.nome, perfil: 'Administrador', viaApiToken: true };
    return next();
  }

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') throw new Error('tipo de token inválido');
    req.user = {
      id: payload.sub,
      email: payload.email,
      perfil: payload.perfil,
      perfilId: payload.perfilId,
      nome: payload.nome,
    };
    return next();
  } catch {
    throw unauthorized('Token de acesso inválido ou expirado.');
  }
});

const ACAO_COLUMN = { ver: 'pode_ver', criar: 'pode_criar', editar: 'pode_editar', excluir: 'pode_excluir' };

/**
 * Verifica, em tempo real, se o perfil do usuário autenticado tem a
 * permissão pedida para o módulo informado (tabela perfil_permissoes).
 * Tokens de API de longa duração (uso do app Android) sempre têm acesso
 * total. A checagem consulta o banco a cada requisição (em vez de embutir
 * as permissões no JWT) para que mudanças feitas na tela de Perfis de
 * acesso valham imediatamente, sem exigir novo login.
 */
export const requirePermission = (modulo, acao) =>
  asyncHandler(async (req, res, next) => {
    if (req.user?.viaApiToken) return next();
    const column = ACAO_COLUMN[acao];
    if (!req.user?.perfilId || !column) {
      throw forbidden('Seu perfil não tem permissão para executar esta ação.');
    }
    const { rows } = await query(
      `SELECT ${column} AS permitido FROM perfil_permissoes WHERE perfil_id = $1 AND modulo = $2`,
      [req.user.perfilId, modulo]
    );
    if (!rows[0]?.permitido) {
      throw forbidden('Seu perfil não tem permissão para executar esta ação.');
    }
    next();
  });
