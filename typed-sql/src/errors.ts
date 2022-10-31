export class DuplicateSQLParameterNameError extends Error {
  public constructor(public readonly parameterName: string) {
    super(`Duplicate SQL parameter name: "${parameterName}".`);
  }
}

export class InvalidSQLTemplateArgumentError extends Error {
  public constructor(public readonly index: number) {
    super(`Invalid template argument passed at index ${index}.`);
  }
}
export const isDuplicateSQLParameterNameError = (
  error: Error,
): error is DuplicateSQLParameterNameError =>
  error instanceof DuplicateSQLParameterNameError;

export const isInvalidSQLTemplateArgumentError = (
  error: Error,
): error is InvalidSQLTemplateArgumentError =>
  error instanceof InvalidSQLTemplateArgumentError;
