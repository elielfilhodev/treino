export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const createError = {
  unauthorized: (message = "Não autorizado") => new ApiError(401, message),
  forbidden: (message = "Acesso negado") => new ApiError(403, message),
  notFound: (message = "Recurso não encontrado") => new ApiError(404, message),
  badRequest: (message = "Requisição inválida", details?: unknown) =>
    new ApiError(400, message, details),
  conflict: (message = "Conflito") => new ApiError(409, message),
};

