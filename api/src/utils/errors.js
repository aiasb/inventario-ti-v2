export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (resource = 'Recurso') =>
  new ApiError(404, 'NOT_FOUND', `${resource} não encontrado.`);

export const badRequest = (message, details) => new ApiError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'Credenciais inválidas ou ausentes.') =>
  new ApiError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Você não tem permissão para executar esta ação.') =>
  new ApiError(403, 'FORBIDDEN', message);

export const conflict = (message) => new ApiError(409, 'CONFLICT', message);
