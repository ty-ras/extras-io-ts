import * as t from "io-ts";
import { function as F, either as E } from "fp-ts";
import type * as tyrasEP from "@ty-ras/endpoint";
import * as tyras from "@ty-ras/data-io-ts";
import type * as validation from "./validation";
import type * as state from "./state";
import type * as stateInfo from "./state-info";
import * as spec from "./spec";

export const createStateValidatorFactory =
  <TStateValidation extends validation.TStateValidationBase>(
    validation: TStateValidation,
  ): CreateStateValidatorFactory<TStateValidation> =>
  (specObject) => {
    const entries = Object.entries(specObject) as Array<
      [
        keyof typeof specObject & keyof TStateValidation,
        spec.StatePropertySpec<TStateValidation>,
      ]
    >;
    const getValidator = (
      ...[propName, propSpec]: typeof entries[number]
    ): t.Mixed => {
      if (typeof propSpec === "boolean") {
        // For booleans, simply return the property validator.
        // It will be part of 'type' or 'partial'.
        return (
          validation[propName]?.validation ??
          // String(...) call is because:
          // Implicit conversion of a 'symbol' to a 'string' will fail at runtime. Consider wrapping this expression in 'String(...)'.
          doThrow(`State does not contain "${String(propName)}".`)
        );
      } else {
        // For more complex spec, see what is being specified and return validation based on that.
        switch (propSpec.match) {
          case spec.MATCH_EXACT: {
            const matched = propSpec.value;
            return t.refinement(t.unknown, (v) => v === matched);
          }
          case spec.MATCH_ONE_OF: {
            const oneOf = propSpec.values;
            return t.refinement(t.UnknownArray, (arr) =>
              oneOf.some((one) => arr.some((v) => v === one)),
            );
          }
          case spec.MATCH_ALL_OF: {
            const allOf = propSpec.values;
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
              validation[propName]?.validation ??
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
              data: result as state.GetState<
                TStateValidation,
                typeof specObject
              >,
            }),
          ),
          // "Merge" the result of previous operation as TyRAS operates on type unions, not either-or constructs.
          E.toUnion,
        ),
    };
  };

export type CreateStateValidatorFactory<
  TStateValidation extends validation.TStateValidationBase,
> = <TStateSpec extends spec.StateSpec<TStateValidation>>(
  spec: TStateSpec,
) => tyrasEP.EndpointStateValidator<
  stateInfo.StateInfoOfKeys<keyof TStateSpec>,
  state.GetState<TStateValidation, TStateSpec>
>;

export type GetStateValidationInfo<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TFactory extends CreateStateValidatorFactory<any>,
> = TFactory extends CreateStateValidatorFactory<infer TStateValidation>
  ? TStateValidation
  : never;

const errorsHaveKey = (errors: t.Errors, predicate: (key: string) => boolean) =>
  errors.some((error) => error.context.some(({ key }) => predicate(key)));

const doThrow = (msg: string) => {
  throw new Error(msg);
};
