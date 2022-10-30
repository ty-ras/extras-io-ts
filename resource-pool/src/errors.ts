export class ResourcePoolFullError extends Error {}
export class ResourceNotPartOfPoolError extends Error {}

export const isResourcePoolFullError = (
  error: Error,
): error is ResourcePoolFullError => error instanceof ResourcePoolFullError;

export const isResourceNotPartOfPoolError = (
  error: Error,
): error is ResourceNotPartOfPoolError =>
  error instanceof ResourceNotPartOfPoolError;
