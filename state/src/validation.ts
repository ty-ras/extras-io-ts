/**
 * @file This file contains the function to create necessary full state validation info from state validations for normal properties, and properties related to user authentication.
 */

import type * as t from "io-ts";
import * as tyras from "@ty-ras/data";

/**
 * Constructs {@link StatePropertyValidation} objects from given native `io-ts` validators.
 * @param authenticated The validators for properties related to authenticated user (e.g. user ID, email, etc).
 * @param other The validators for properties related to internal things (e.g. DB connection pool, etc).
 * @returns The full state validation as an object with values being {@link StatePropertyValidation}, with given validators combined, and their {@link StatePropertyValidation#isAuthenticatedProperty} set appropriately.
 */
export const getFullStateValidationInfo = <
  TAuthenticated extends Record<string, t.Mixed>,
  TOther extends Record<string, t.Mixed>,
>(
  authenticated: TAuthenticated,
  other: TOther,
) =>
  ({
    ...tyras.transformEntries(other, (validation) => ({
      validation,
      isAuthenticationProperty: false,
    })),
    ...tyras.transformEntries(authenticated, (validation) => ({
      validation,
      isAuthenticationProperty: true,
    })),
  } as {
    readonly [P in keyof TAuthenticated]: StatePropertyValidation<
      TAuthenticated[P],
      true
    >;
  } & {
    readonly [P in keyof TOther]: StatePropertyValidation<TOther[P], false>;
  });

/**
 * The base type for return value of {@link getFullStateValidationInfo}.
 */
export type TStateValidationBase = Record<
  string,
  StatePropertyValidation<t.Mixed, boolean>
>;

/**
 * The type of values of object returned by {@link getFullStateValidationInfo}.
 */
export interface StatePropertyValidation<
  TValidation extends t.Mixed,
  TIsAuthentication extends boolean,
> {
  /**
   * The native `io-ts` validator object.
   */
  validation: TValidation;

  /**
   * Whether this state property is related to user authentication.
   * The TyRAS framework will use this information to create automatic error `403` for BE endpoints which require authenticated state/context properties, if they failed to be supplied (e.g. missing/malformed `Authorization` header from HTTP request).
   */
  isAuthenticationProperty: TIsAuthentication;
}
