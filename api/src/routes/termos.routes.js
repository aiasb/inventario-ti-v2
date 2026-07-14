import { Router } from 'express';
import fs from 'node:fs';
import { query, pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/errors.js';
import { parsePagination, buildSort, paginatedResponse } from '../utils/pagination.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { formatDateBR } from '../utils/formatDate.js';
import { renderDocxTemplate, renderDocxTemplateToHtml } from '../utils/docx.js';

const router = Router();

const SORT_COLUMNS = { numero: 't.numero', colaborador: 't.colaborador', data: 't.data', updatedAt: 't.updated_at' };

async function mapTermo(row) {
  const { rows: equipamentos } = await query(
    `SELECT e.id, e.serial, e.modelo, e.hostname, e.imei, te2.nome AS tipo_nome
     FROM termo_equipamentos te
     JOIN equipamentos e ON e.id = te.equipamento_id
     LEFT JOIN tipos_equipamento te2 ON te2.id = e.tipo_id
     WHERE te.termo_id = $1`,
    [row.id]
  );
  return {
    id: row.id,
    numero: row.numero,
    colaborador: row.colaborador,
    cargo: row.cargo,
    data: row.data,
    observacoes: row.observacoes,
    assinado: row.assinado,
    dataAssinatura: row.data_assinatura,
    modelo: row.modelo_id
      ? { id: row.modelo_id, nome: row.modelo_nome, texto: row.modelo_texto, temArquivo: !!row.modelo_arquivo_path }
      : null,
    responsavel: row.responsavel_id
      ? { id: row.responsavel_id, nome: row.resp_nome, cpf: row.resp_cpf, matricula: row.resp_matricula, setor: row.resp_setor_nome }
      : null,
    equipamentos: equipamentos.map((e) => ({
      id: e.id, serial: e.serial, modelo: e.modelo,
      hostname: e.hostname, imei: e.imei, tipo: e.tipo_nome,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT t.*, tm.nome AS modelo_nome, tm.texto AS modelo_texto, tm.arquivo_path AS modelo_arquivo_path,
         resp.nome AS resp_nome, resp.cpf AS resp_cpf, resp.matricula AS resp_matricula, rs.nome AS resp_setor_nome
  FROM termos t
  LEFT JOIN termo_modelos tm ON tm.id = t.modelo_id
  LEFT JOIN responsaveis resp ON resp.id = t.responsavel_id
  LEFT JOIN setores rs ON rs.id = resp.setor_id
`;

async function nextNumero() {
  const { rows } = await query(`SELECT numero FROM termos ORDER BY id DESC LIMIT 1`);
  const last = rows[0]?.numero;
  const n = last ? parseInt(last.replace('TERMO-', ''), 10) + 1 : 1;
  return `TERMO-${String(n).padStart(4, '0')}`;
}

/**
 * @openapi
 * /termos:
 *   get:
 *     tags: [Termos]
 *     summary: Lista termos de responsabilidade
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista paginada de termos }
 */
router.get(
  '/',
  requireAuth,
  requirePermission('termos', 'ver'),
  asyncHandler(async (req, res) => {
    const { q, assinado } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const orderBy = buildSort(req.query, SORT_COLUMNS, 't.data DESC'.split(' ')[0]);

    const conditions = ['t.deleted_at IS NULL'];
    const params = [];
    if (assinado !== undefined) {
      params.push(assinado === 'true');
      conditions.push(`t.assinado = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(t.numero ILIKE $${idx} OR t.colaborador ILIKE $${idx})`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM termos t ${where}`, params);
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const data = await Promise.all(rows.map(mapTermo));
    res.json(paginatedResponse({ data, total, page, limit }));
  })
);

router.get(
  '/:id',
  requireAuth,
  requirePermission('termos', 'ver'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1 AND t.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) throw notFound('Termo');
    res.json(await mapTermo(rows[0]));
  })
);

/**
 * @openapi
 * /termos:
 *   post:
 *     tags: [Termos]
 *     summary: Cria um termo de responsabilidade vinculando equipamentos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Termo criado }
 */
router.post(
  '/',
  requireAuth,
  requirePermission('termos', 'criar'),
  asyncHandler(async (req, res) => {
    const { colaborador, cargo, data, observacoes, equipamentoIds, modeloId, responsavelId } = req.body;
    if (!colaborador || !Array.isArray(equipamentoIds) || equipamentoIds.length === 0) {
      throw badRequest('Campos obrigatórios: colaborador e ao menos um equipamentoId.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const numero = await nextNumero();
      const { rows } = await client.query(
        `INSERT INTO termos (numero, colaborador, cargo, data, observacoes, modelo_id, responsavel_id)
         VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7) RETURNING id`,
        [numero, colaborador, cargo || null, data || null, observacoes || null, modeloId || null, responsavelId || null]
      );
      const termoId = rows[0].id;
      for (const equipamentoId of equipamentoIds) {
        await client.query(`INSERT INTO termo_equipamentos (termo_id, equipamento_id) VALUES ($1,$2)`, [
          termoId, equipamentoId,
        ]);
      }
      await client.query('COMMIT');

      const { rows: created } = await query(`${BASE_SELECT} WHERE t.id = $1`, [termoId]);
      res.status(201).json(await mapTermo(created[0]));
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
  requirePermission('termos', 'editar'),
  asyncHandler(async (req, res) => {
    const existing = await query(`SELECT id FROM termos WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!existing.rows[0]) throw notFound('Termo');

    const { equipamentoIds } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fields = {
        colaborador: 'colaborador', cargo: 'cargo', data: 'data', observacoes: 'observacoes',
        modeloId: 'modelo_id', assinado: 'assinado', dataAssinatura: 'data_assinatura',
        responsavelId: 'responsavel_id',
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
        await client.query(`UPDATE termos SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
      }
      if (Array.isArray(equipamentoIds)) {
        await client.query(`DELETE FROM termo_equipamentos WHERE termo_id = $1`, [req.params.id]);
        for (const equipamentoId of equipamentoIds) {
          await client.query(`INSERT INTO termo_equipamentos (termo_id, equipamento_id) VALUES ($1,$2)`, [
            req.params.id, equipamentoId,
          ]);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json(await mapTermo(rows[0]));
  })
);

async function loadTermoParaDocumento(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1 AND t.deleted_at IS NULL`, [id]);
  const row = rows[0];
  if (!row) throw notFound('Termo');
  if (!row.modelo_arquivo_path) {
    throw badRequest('Este termo não está vinculado a um modelo com arquivo .docx enviado.');
  }
  if (!fs.existsSync(row.modelo_arquivo_path)) {
    throw notFound('Arquivo do modelo');
  }

  const termo = await mapTermo(row);
  const seriais = termo.equipamentos.map((e) => e.serial).join(' + ');
  const modelosEquip = termo.equipamentos.map((e) => e.modelo).join(' + ');
  const imeis = termo.equipamentos.map((e) => e.imei).filter(Boolean).join(' + ');
  const listaEquipamentos = termo.equipamentos
    .map((e) => `${e.modelo} (${e.serial})`)
    .join('\n');

  const data = {
    numero: termo.numero,
    nome: termo.colaborador,
    cargo: termo.cargo || '',
    data: formatDateBR(termo.data),
    status: termo.assinado ? 'Assinado' : 'Pendente',
    data_assinatura: formatDateBR(termo.dataAssinatura),
    cpf: termo.responsavel?.cpf || '',
    matricula: termo.responsavel?.matricula || '',
    setor: termo.responsavel?.setor || '',
    observacoes: termo.observacoes || '',
    serial: seriais,
    imei: imeis,
    modelo: modelosEquip,
    equipamentos: listaEquipamentos,
  };

  return { termo, templatePath: row.modelo_arquivo_path, data };
}

/**
 * @openapi
 * /termos/{id}/documento:
 *   get:
 *     tags: [Termos]
 *     summary: Gera o termo preenchido a partir do modelo .docx vinculado, substituindo variáveis (%nome%, %cpf%, %serial% etc.)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Arquivo .docx gerado }
 *       404: { description: Termo, modelo ou arquivo .docx não encontrado }
 */
router.get(
  '/:id/documento',
  requireAuth,
  requirePermission('termos', 'ver'),
  asyncHandler(async (req, res) => {
    const { termo, templatePath, data } = await loadTermoParaDocumento(req.params.id);
    const buffer = renderDocxTemplate(templatePath, data);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${termo.numero}.docx"`);
    res.send(buffer);
  })
);

/**
 * @openapi
 * /termos/{id}/documento/preview:
 *   get:
 *     tags: [Termos]
 *     summary: Prévia em HTML do termo preenchido a partir do modelo .docx (mesma formatação básica do Word, para visualizar/imprimir sem baixar o arquivo)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: HTML gerado }
 *       404: { description: Termo, modelo ou arquivo .docx não encontrado }
 */
router.get(
  '/:id/documento/preview',
  requireAuth,
  requirePermission('termos', 'ver'),
  asyncHandler(async (req, res) => {
    const { templatePath, data } = await loadTermoParaDocumento(req.params.id);
    const html = await renderDocxTemplateToHtml(templatePath, data);
    res.json({ html });
  })
);

/**
 * @openapi
 * /termos/{id}/assinatura:
 *   patch:
 *     tags: [Termos]
 *     summary: Marca ou desmarca um termo como assinado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Termo atualizado }
 */
router.patch(
  '/:id/assinatura',
  requireAuth,
  requirePermission('termos', 'editar'),
  asyncHandler(async (req, res) => {
    const { assinado } = req.body;
    if (typeof assinado !== 'boolean') throw badRequest('Informe "assinado" como booleano.');
    const result = await query(
      `UPDATE termos SET assinado = $1, data_assinatura = CASE WHEN $1 THEN COALESCE(data_assinatura, CURRENT_DATE) ELSE NULL END
       WHERE id = $2 AND deleted_at IS NULL`,
      [assinado, req.params.id]
    );
    if (result.rowCount === 0) throw notFound('Termo');
    const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json(await mapTermo(rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('termos', 'excluir'),
  asyncHandler(async (req, res) => {
    const result = await query(`UPDATE termos SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (result.rowCount === 0) throw notFound('Termo');
    res.status(204).send();
  })
);

export default router;
