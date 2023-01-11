import type * as t from "io-ts";
import type * as validation from "./validation";

export type StateSpec<
  TStateValidation extends validation.TStateValidationBase,
> = Partial<{
  readonly [P in keyof TStateValidation]: StatePropertySpec<
    t.TypeOf<TStateValidation[P]["validation"]>
  >;
}>;
export type StatePropertySpec<T> = T extends boolean
  ? // Only allow match specs
    StatePropertyMatchSpec<T>
  : // Allow simple spec + match specs
    StatePropertySpecAll<T>;

export type StatePropertySpecAll<T> =
  | StatePropertyRequiredSpec
  | StatePropertyMatchSpec<T>;
export type StatePropertyRequiredSpec = boolean;
export type StatePropertyMatchSpec<T> =
  | StatePropertyMatchSpecExact<T>
  | StatePropertyMatchSpecOneOf<T>
  | StatePropertyMatchSpecAllOf<T>;
export interface StatePropertyMatchSpecExact<T> {
  match: typeof MATCH_EXACT;
  value: T;
}
export interface StatePropertyMatchSpecOneOf<T> {
  match: typeof MATCH_ONE_OF;
  values: ReadonlyArray<T>;
}
export interface StatePropertyMatchSpecAllOf<T> {
  match: typeof MATCH_ALL_OF;
  values: T extends Array<infer U> ? ReadonlyArray<U> : never;
}

export const MATCH_EXACT = "exact";
export const MATCH_ONE_OF = "oneOf";
export const MATCH_ALL_OF = "allOf";
