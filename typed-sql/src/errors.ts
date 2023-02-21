import * as t from "io-ts";

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

export class SQLQueryValidationError extends Error {}

export class SQLQueryInputValidationError extends SQLQueryValidationError {
  public constructor(public readonly validationError: t.Errors) {
    super(failure(validationError).join("\n"));
  }
}

export class SQLQueryOutputValidationError extends SQLQueryValidationError {
  public constructor(public readonly validationError: t.Errors) {
    super(failure(validationError).join("\n"));
  }
}

export const isDuplicateSQLParameterNameError = (
  error: unknown,
): error is DuplicateSQLParameterNameError =>
  error instanceof DuplicateSQLParameterNameError;

export const isInvalidSQLTemplateArgumentError = (
  error: unknown,
): error is InvalidSQLTemplateArgumentError =>
  error instanceof InvalidSQLTemplateArgumentError;

export const isSQLQueryInputValidationError = (
  error: unknown,
): error is SQLQueryInputValidationError =>
  error instanceof SQLQueryInputValidationError;

export const isSQLQueryOutputValidationError = (
  error: unknown,
): error is SQLQueryOutputValidationError =>
  error instanceof SQLQueryOutputValidationError;

// Right now, doing this breaks at runtime:
// import { PathReporter } from "io-ts/PathReporter";
// With error:
// Error: Cannot find module '<base>/node_modules/io-ts/PathReporter' imported from <base>/src/api/data/io-ts/error.ts
// It looks like it has something to do with ts-node, because e.g. Vite can resolve those imports without problems.
/* c8 ignore start */
const failure = (errors: t.Errors) => errors.map(getMessage);
const getMessage = (e: t.ValidationError) =>
  e.message !== undefined
    ? e.message
    : `Invalid value ${stringify(e.value)} supplied to ${getContextPath(
        e.context,
      )}`;
const stringify = (v: unknown) => {
  if (typeof v === "function") {
    return t.getFunctionName(v);
  }
  if (typeof v === "number" && !isFinite(v)) {
    if (isNaN(v)) {
      return "NaN";
    }
    return v > 0 ? "Infinity" : "-Infinity";
  }
  return JSON.stringify(v);
};
const getContextPath = (context: t.Context) => {
  return context.map(({ key, type }) => `${key}: ${type.name}`).join("/");
};
/* c8 ignore stop */
