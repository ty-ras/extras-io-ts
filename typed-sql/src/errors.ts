/**
 * @file This file contains code related to errors used in this library.
 */

import * as t from "io-ts";

/**
 * This error is used when SQL string contains two or more SQL parameters with same name, which are not exactly the same parameter.
 * Notice that only type information is exposed about this class, use {@link isDuplicateSQLParameterNameError} to check whether given error is of this type at runtime.
 */
export class DuplicateSQLParameterNameError extends Error {
  /**
   * Creates new instance of this class.
   * @param parameterName The name of the parameter.
   */
  public constructor(public readonly parameterName: string) {
    super(`Duplicate SQL parameter name: "${parameterName}".`);
  }
}

/**
 * This error is used whenever something else than allowed values are specified within SQL string literals.
 * Notice that only type information is exposed about this class, use {@link isInvalidSQLTemplateArgumentError} to check whether given error is of this type at runtime.
 */
export class InvalidSQLTemplateArgumentError extends Error {
  /**
   * Creates new instance of this class.
   * @param index The index of the parameter.
   */
  public constructor(public readonly index: number) {
    super(`Invalid template argument passed at index ${index}.`);
  }
}

/**
 * This is common class for {@link SQLQueryInputValidationError} and {@link SQLQueryOutputValidationError}.
 * Notice that only type information is exposed about this class, use {@link isSQLQueryValidationError} to check whether given error is of this type at runtime.
 */
export class SQLQueryValidationError extends Error {}

/**
 * This error is used whenever there is validation error with inputs provided to SQL query at execution time.
 * Notice that only type information is exposed about this class, use {@link isSQLQueryInputValidationError} to check whether given error is of this type at runtime.
 */
export class SQLQueryInputValidationError extends SQLQueryValidationError {
  /**
   * Creates new instance of this class.
   * @param validationError The validation error.
   */
  public constructor(public readonly validationError: t.Errors) {
    super(failure(validationError).join("\n"));
  }
}

/**
 * This error is used whenever there is validation error with outputs returned by DB at execution time.
 * Notice that only type information is exposed about this class, use {@link isSQLQueryOutputValidationError} to check whether given error is of this type at runtime.
 */
export class SQLQueryOutputValidationError extends SQLQueryValidationError {
  /**
   * Creates new instance of this class.
   * @param validationError The validation error.
   */
  public constructor(public readonly validationError: t.Errors) {
    super(failure(validationError).join("\n"));
  }
}

/**
 * Helper function to check whether given error is instance of {@link DuplicateSQLParameterNameError}, since only type information about that class is exported to library users.
 * @param error The error to check.
 * @returns `true` if given error is {@link DuplicateSQLParameterNameError}, `false` otherwise.
 */
export const isDuplicateSQLParameterNameError = (
  error: unknown,
): error is DuplicateSQLParameterNameError =>
  error instanceof DuplicateSQLParameterNameError;

/**
 * Helper function to check whether given error is instance of {@link InvalidSQLTemplateArgumentError}, since only type information about that class is exported to library users.
 * @param error The error to check.
 * @returns `true` if given error is {@link InvalidSQLTemplateArgumentError}, `false` otherwise.
 */
export const isInvalidSQLTemplateArgumentError = (
  error: unknown,
): error is InvalidSQLTemplateArgumentError =>
  error instanceof InvalidSQLTemplateArgumentError;

/**
 * Helper function to check whether given error is instance of {@link SQLQueryValidationError}, since only type information about that class is exported to library users.
 * @param error The error to check.
 * @returns `true` if given error is {@link SQLQueryValidationError}, `false` otherwise.
 */
export const isSQLQueryValidationError = (
  error: unknown,
): error is SQLQueryValidationError => error instanceof SQLQueryValidationError;

/**
 * Helper function to check whether given error is instance of {@link SQLQueryInputValidationError}, since only type information about that class is exported to library users.
 * @param error The error to check.
 * @returns `true` if given error is {@link SQLQueryInputValidationError}, `false` otherwise.
 */
export const isSQLQueryInputValidationError = (
  error: unknown,
): error is SQLQueryInputValidationError =>
  error instanceof SQLQueryInputValidationError;

/**
 * Helper function to check whether given error is instance of {@link SQLQueryOutputValidationError}, since only type information about that class is exported to library users.
 * @param error The error to check.
 * @returns `true` if given error is {@link SQLQueryOutputValidationError}, `false` otherwise.
 */
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
