import { Router } from 'express';
import { query, pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

export const MODULOS = [
  'dashboard', 'inventario', 'manutencoes', 'termos',
  'responsaveis', 'acessos', 'cadastros', 'configuracoes',
  'radios', 'manutencoesRadios', 'responsaveisGeo', 'cadastrosGeo',
];

function emptyPermissoes() {
  return MODULOS.reduce((acc, modulo) => {
    acc[modulo] = { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false };
    return acc;
  }, {});
}

async function loadPermissoes(perfilId) {
  const { rows } = await query(`SELECT * FROM perfil_permissoes WHERE perfil_id = $1`, [perfilId]);
  const permissoes = emptyPermissoes();
  for (const r of rows) {
    if (!permissoes[r.modulo]) continue;
    permissoes[r.modulo] = {
      podeVer: r.pode_ver, podeCriar: r.pode_criar, podeEditar: r.pode_editar, podeExcluir: r.pode_excluir,
    };
  }
  return permissoes;
}

async function mapPerfil(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    permissoes: await loadPermissoes(row.id),
  };
}

function validatePermissoesBody(permissoes) {
  if (permissoes === undefined) return [];
  if (typeof permissoes !== 'object' || permissoes === null) {
    throw badRequest('Campo "permissoes" deve ser um objeto por módulo.');
  }
  const rows = [];
  for (const [modulo, p] of Object.entries(permissoes)) {
    if (!MODULOS.includes(modulo)) throw badRequest(`Módulo inválido: ${modulo}`);
    rows.push({
      modulo,
      podeVer: !!p?.podeVer,
      podeCriar: !!p?.podeCriar,
      podeEditar: !!p?.podeEditar,
      podeExcluir: !!p?.podeExcluir,
    });
  }
  return rows;
}

async function savePermissoes(client, perfilId, permissoes) {
  const rows = validatePermissoesBody(permissoes);
  for (const r of rows) {
    await client.query(
      `INSERT INTO perfil_permissoes (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (perfil_id, modulo) DO UPDATE
         SET pode_ver = $3, pode_criar = $4, pode_editar = $5, pode_excluir = $6`,
      [perfilId, r.modulo, r.podeVer, r.podeCriar, r.podeEditar, r.podeExcluir]
    );
  }
}

router.get(
  '/',
  requireAuth,
  requirePermission('acessos', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM perfis WHERE deleted_at IS NULL ORDER BY nome ASC`);
    res.json({ data: await Promise.all(rows.map(mapPerfil)) });
  })
);

router.get(
  '/:id',
  requireAuth,
  requirePermission('acessos', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM perfis WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Perfil');
    res.json(await mapPerfil(rows[0]));
  })
);

router.post(
  '/',
  requireAuth,
  requirePermission('acessos', 'criar'),
  asyncHandler(async (req, res) => {
    const { nome, descricao, permissoes } = req.body;
    if (!nome) throw badRequest('Informe o nome do perfil.');
    validatePermissoesBody(permissoes);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO perfis (nome, descricao) VALUES ($1,$2) RETURNING *`,
        [nome, descricao || null]
      );
      await savePermissoes(client, rows[0].id, permissoes || {});
      await client.query('COMMIT');
      res.status(201).json(await mapPerfil(rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') throw conflict('Já existe um perfil com este nome.');
      throw err;
    } finally {
      client.release();
    }
  })
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('acessos', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM perfis WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Perfil');

    const { nome, descricao, permissoes } = req.body;
    validatePermissoesBody(permissoes);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sets = [];
      const params = [];
      if (nome !== undefined) { params.push(nome); sets.push(`nome = $${params.length}`); }
      if (descricao !== undefined) { params.push(descricao || null); sets.push(`descricao = $${params.length}`); }
      if (sets.length > 0) {
        params.push(req.params.id);
        await client.query(`UPDATE perfis SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
      }
      if (permissoes !== undefined) {
        await savePermissoes(client, req.params.id, permissoes);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') throw conflict('Já existe um perfil com este nome.');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query(`SELECT * FROM perfis WHERE id = $1`, [req.params.id]);
    res.json(await mapPerfil(rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('acessos', 'excluir'),
  asyncHandler(async (req, res) => {
    if (String(req.user.perfilId) === String(req.params.id)) {
      throw conflict('Você não pode excluir o perfil atualmente atribuído à sua própria conta.');
    }
    // Soft delete (deleted_at) não aciona a FK de usuarios.perfil_id — a linha continua
    // existindo fisicamente, então é preciso checar o uso explicitamente aqui, ou um
    // usuário ficaria com as permissões do perfil "excluído" até ser reatribuído.
    const emUso = await query(`SELECT 1 FROM usuarios WHERE perfil_id = $1 AND deleted_at IS NULL LIMIT 1`, [req.params.id]);
    if (emUso.rows[0]) {
      throw conflict('Este perfil está em uso por um ou mais usuários e não pode ser removido.');
    }
    const result = await query(`UPDATE perfis SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Perfil');
    res.status(204).send();
  })
);

export default router;
