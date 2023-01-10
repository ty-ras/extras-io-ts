import * as t from "io-ts";
import { function as F, either as E } from "fp-ts";
import type * as tyrasEP from "@ty-ras/endpoint";
import * as tyras from "@ty-ras/data-io-ts";

export const createStateValidatorFactory =
  <TStateValidation extends TStateValidationBase>(
    validation: TStateValidation,
  ) =>
  <
    TStateSpec extends StateSpec<{
      [K in keyof TStateValidation]: t.TypeOf<
        TStateValidation[K]["validation"]
      >;
    }>,
  >(
    spec: TStateSpec,
  ): tyrasEP.EndpointStateValidator<
    StateInfoOfKeys<keyof TStateValidation>,
    GetState<TStateValidation, TStateSpec>
    // eslint-disable-next-line sonarjs/cognitive-complexity
  > => {
    const entries = Object.entries(spec) as Array<
      [keyof TStateValidation, StatePropertySpec<TStateSpec[keyof TStateSpec]>]
    >;
    const getValidator = (
      ...[propName, propSpec]: typeof entries[number]
    ): t.Mixed => {
      if (typeof propSpec === "boolean") {
        // For booleans, simply return the property validator.
        // It will be part of 'type' or 'partial'.
        return (
          validation[propName].validation ??
          // String(...) call is because:
          // Implicit conversion of a 'symbol' to a 'string' will fail at runtime. Consider wrapping this expression in 'String(...)'.
          doThrow(`State does not contain "${String(propName)}".`)
        );
      } else {
        switch (propSpec.match) {
          case MATCH_EXACT: {
            const matched = propSpec.value;
            return t.refinement(t.unknown, (v) => v === matched);
          }
          case MATCH_ONE_OF: {
            const oneOf = propSpec.values;
            return t.refinement(t.UnknownArray, (arr) =>
              oneOf.some((one) => arr.some((v) => v === one)),
            );
          }
          case MATCH_ALL_OF: {
            const allOf = propSpec.values as ReadonlyArray<unknown>;
            return t.refinement(t.UnknownArray, (arr) =>
              allOf.every((one) => arr.some((v) => v === one)),
            );
          }
        }
      }
    };
    const validator = t.intersection([
      t.type(
        Object.fromEntries(
          entries
            .filter(([, propSpec]) => propSpec !== false)
            .map(
              ([propName, propSpec]) =>
                [propName, getValidator(propName, propSpec)] as const,
            ),
        ),
        "MandatoryState",
      ),
      t.partial(
        Object.fromEntries(
          entries
            .filter(([, propSpec]) => propSpec === false)
            .map(([propName]) => [
              propName,
              validation[propName].validation ??
                doThrow(`State does not contain "${String(propName)}".`),
            ]),
        ),
        "OptionalState",
      ),
    ]);
    return {
      stateInfo: entries.map(([propName]) => propName),
      validator: (input) =>
        F.pipe(
          // Start with input
          input,
          // Validate the input - the result will be success or error
          validator.decode,
          // Perform transformation in case of both success and error
          E.bimap(
            // On error, check if error is about any property name related to authentication state
            (errors) => {
              return errorsHaveKey(
                errors,
                (key) => validation[key]?.isAuthenticationProperty ?? false,
              )
                ? // This was authentication related error -> return 401
                  {
                    error: "protocol-error" as const,
                    statusCode: 401, // 401 is "no authentication", while 403 is "no permission even with authentication"
                    body: undefined,
                  }
                : // This was other error - perhaps DB pool creation failed? Will return 500
                  tyras.createErrorObject(errors);
            },
            // In case of success, transform it into DataValidationResponseSuccess
            (result) => ({
              error: "none" as const,
              data: result as GetState<TStateValidation, TStateSpec>,
            }),
          ),
          // "Merge" the result of previous operation as TyRAS operates on type unions, not either-or constructs.
          E.toUnion,
        ),
    };
  };

export type TStateValidationBase = Record<
  string,
  { validation: t.Mixed; isAuthenticationProperty: boolean }
>;

export type StateInfo<TState> = StateInfoOfKeys<keyof TState>;
export type StateInfoOfKeys<TKeys extends PropertyKey> = ReadonlyArray<TKeys>;

export type StateSpec<TState extends object> = Partial<{
  readonly [P in keyof TState]: StatePropertySpec<TState[P]>;
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
  values: ReadonlyArray<T>;
}

export const MATCH_EXACT = "exact";
export const MATCH_ONE_OF = "one_of";
export const MATCH_ALL_OF = "all_of";

export type GetState<
  TStateValidation extends TStateValidationBase,
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

export type NonOptionalStateKeys<T> = {
  [P in keyof T]-?: false extends T[P] ? never : P;
}[keyof T];

const errorsHaveKey = (errors: t.Errors, predicate: (key: string) => boolean) =>
  errors.some((error) => error.context.some(({ key }) => predicate(key)));

const doThrow = (msg: string) => {
  throw new Error(msg);
};
