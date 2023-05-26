/**
 * @file This types-only file contains type definitions for specifying required state/context for an endpoint using object with each property expressing how the state element with the property name should be acquired (mandatory/optional, etc).
 */

import type * as t from "io-ts";
import type * as validation from "./validation";
import type * as consts from "./consts";

/**
 * This is type for object which define the state/context needed by BE endpoint.
 * Each property should describe how the required state/context element should be provided via {@link StatePropertySpec}.
 */
export type StateSpec<
  TStateValidation extends validation.TStateValidationBase,
> = Partial<{
  readonly [P in keyof TStateValidation]: StatePropertySpec<
    t.TypeOf<TStateValidation[P]["validation"]>
  >;
}>;

/**
 * This is type for each element of {@link StateSpec}.
 * If the target type of the state validation for this element is for some reason `boolean`, only {@link StatePropertyMatchSpec} value is allowed.
 * Otherwise, {@link StatePropertySpecAll} value is allowed.
 * @see StatePropertySpecAll
 * @see StatePropertyMatchSpec
 */
export type StatePropertySpec<T> = T extends boolean
  ? StatePropertyMatchSpec<T>
  : StatePropertySpecAll<T>;

/**
 * The type for values of {@link StateSpec} object when the state validation output is something else than `boolean`.
 * Allows specifying optionality via {@link StatePropertyRequiredSpec}.
 * @see StatePropertyRequiredSpec
 * @see StatePropertyMatchSpec
 */
export type StatePropertySpecAll<T> =
  | StatePropertyRequiredSpec
  | StatePropertyMatchSpec<T>;

/**
 * Set to `true` if the state element must be present, `false` otherwise.
 */
export type StatePropertyRequiredSpec = boolean;

/**
 * The type for values of {@link StateSpec} object.
 * @see StatePropertyMatchSpecExact
 * @see StatePropertyMatchSpecOneOf
 * @see StatePropertyMatchSpecAllOf
 */
export type StatePropertyMatchSpec<T> =
  | StatePropertyMatchSpecExact<T>
  | StatePropertyMatchSpecOneOf<T>
  | StatePropertyMatchSpecAllOf<T>;

/**
 * Specify that validated value must be exact match of given {@link StatePropertyMatchSpecExact#value}.
 */
export interface StatePropertyMatchSpecExact<T> {
  /**
   * Type discrminator property identifying this object as {@link StatePropertyMatchSpecExact}.
   */
  match: typeof consts.MATCH_EXACT;
  /**
   * The value to match against.
   */
  value: T;
}

/**
 * Specify that validated value must be exact match of one of the given {@link StatePropertyMatchSpecOneOf#values}.
 */
export interface StatePropertyMatchSpecOneOf<T> {
  /**
   * Type discrminator property identifying this object as {@link StatePropertyMatchSpecOneOf}.
   */
  match: typeof consts.MATCH_ONE_OF;

  /**
   * The values, one of which must match.
   */
  values: ReadonlyArray<T>;
}

/**
 * Specify that validated value must be array containing all of the given {@link StatePropertyMatchSpecAllOf#values}.
 */
export interface StatePropertyMatchSpecAllOf<T> {
  /**
   * Type discrminator property identifying this object as {@link StatePropertyMatchSpecAllOf}.
   */
  match: typeof consts.MATCH_ALL_OF;

  /**
   * The values, one of which must have at least one match in the target array.
   */
  values: T extends Array<infer U> ? ReadonlyArray<U> : never;
}
