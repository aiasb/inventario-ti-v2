import { query } from '../db.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Faz mutações repetidas com a mesma chave (header Idempotency-Key) retornarem
 * a resposta já gravada da primeira execução, em vez de rodar o handler de
 * novo. Necessário porque o app mobile reenvia operações de uma fila offline
 * sempre que a rede volta, e uma requisição pode ter sido processada com
 * sucesso no servidor mesmo que a resposta nunca tenha chegado ao cliente —
 * sem isso, o reenvio criaria um registro duplicado.
 */
export function idempotency() {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key || !MUTATING_METHODS.has(req.method) || !UUID_RE.test(key)) return next();

    try {
      const { rows } = await query(
        `SELECT status_code, response_body FROM idempotency_keys WHERE key = $1`,
        [key]
      );
      if (rows[0]) {
        return res.status(rows[0].status_code).json(rows[0].response_body);
      }
    } catch (err) {
      console.error('[idempotency] falha ao consultar chave:', err);
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      query(
        `INSERT INTO idempotency_keys (key, method, path, status_code, response_body)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING`,
        [key, req.method, req.originalUrl, res.statusCode, JSON.stringify(body)]
      ).catch((err) => console.error('[idempotency] falha ao gravar chave:', err));
      return originalJson(body);
    };
    next();
  };
}
