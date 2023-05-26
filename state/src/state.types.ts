/**
 * @file This types-only file contains types used to obtain final shape of the state/context needed by BE endpoints.
 */

import type * as t from "io-ts";
import type * as validation from "./validation";

/**
 * Helper type to extract the final shape of the state/context, given the full state validation, and description of state/context needed by BE endpoint.
 * @see validation.TStateValidationBase
 */
export type GetState<
  TStateValidation extends validation.TStateValidationBase,
  TStateSpec,
> = {
  [P in keyof TStateValidation & NonOptionalStateKeys<TStateSpec>]: t.TypeOf<
    TStateValidation[P]["validation"]
  >;
} & {
  [P in keyof TStateValidation &
    Exclude<keyof TStateSpec, NonOptionalStateKeys<TStateSpec>>]?: t.TypeOf<
    TStateValidation[P]["validation"]
  >;
};

/**
 * Helper type to extract the shape of the full state, given the full state validation.
 * @see validation.TStateValidationBase
 */
export type GetFullState<
  TStateValidation extends validation.TStateValidationBase,
> = GetState<TStateValidation, { [P in keyof TStateValidation]: true }>;

/**
 * Auxiliary type used by {@link GetState} to extract non-optional keys from given type.
 */
export type NonOptionalStateKeys<T> = {
  [P in keyof T]-?: false extends T[P] ? never : P;
}[keyof T];
