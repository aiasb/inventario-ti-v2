import { ApiError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Rota ${req.method} ${req.originalUrl} não existe.` },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: { code: 'DUPLICATE', message: 'Já existe um registro com esse valor único.', details: err.detail },
    });
  }
  if (err.code === '23503') {
    return res.status(409).json({
      error: { code: 'FOREIGN_KEY', message: 'Registro referenciado não existe ou está em uso.', details: err.detail },
    });
  }
  if (err.code === '22P02') {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Valor inválido enviado para um dos campos.' },
    });
  }

  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
}
