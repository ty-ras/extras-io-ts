import type * as t from "io-ts";
import type * as validation from "./validation";

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

export type GetFullState<
  TStateValidation extends validation.TStateValidationBase,
> = GetState<TStateValidation, { [P in keyof TStateValidation]: true }>;

export type NonOptionalStateKeys<T> = {
  [P in keyof T]-?: false extends T[P] ? never : P;
}[keyof T];
