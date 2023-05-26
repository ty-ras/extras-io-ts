/**
 * @file This file contains code using `io-ts` validators to parse JSON string and validate the resulting value.
 */

import { function as F, either as E } from "fp-ts";
import * as t from "io-ts";

/**
 * Creates callback which will validate given `unknown` values by checking that they are `string`s, parsing them as JSON, and then validating the value using given `io-ts` validator.
 * @param validation The `io-ts` validator object.
 * @returns Callback which will ensure that given input is `string`, attempt to parse JSON as string, and then validate it using given `validation`.
 * The callback will return {@link F.Either}.
 */
export const validateFromMaybeStringifiedJSON =
  <TValidation extends t.Mixed>(validation: TValidation) =>
  (maybeJsonString: unknown) =>
    F.pipe(
      maybeJsonString,
      E.fromPredicate(
        (str): str is string => typeof str === "string",
        () => new Error("Given value must be string."),
      ),
      E.chain(validateFromStringifiedJSON(validation)),
    );

/**
 * Creates callback which will validate given `unknown` values by checking that they are `string`s, parsing them as JSON, and then validating the value using given `io-ts` validator.
 * If any error occurs, it will be thrown directly from the callback.
 * @param validation The `io-ts` validator object.
 * @returns Callback which will ensure that given input is `string`, attempt to parse JSON as string, and then validate it using given `validation`.
 * The callback will either return validated value as-is, or `throw` an error.
 */
export const validateFromMaybeStringifiedJSONOrThrow = <
  TValidation extends t.Mixed,
>(
  validation: TValidation,
) =>
  F.flow(
    validateFromMaybeStringifiedJSON(validation),
    E.getOrElse<Error | t.Errors, t.TypeOf<TValidation>>((e) => {
      throw new Error(`Configuration was invalid: ${e}`);
    }),
  );

/**
 * Creates callback which will validate given optional `string` values by checking that they are non-empty `string`s, parsing them as JSON, and then validating the value using given `io-ts` validator.
 * @param validation The `io-ts` validator object.
 * @returns Callback which will ensure that given input is non-empty `string`, attempt to parse JSON as string, and then validate it using given `validation`.
 * The callback will return {@link F.Either}.
 */
export const validateFromStringifiedJSON =
  <TValidation extends t.Mixed>(validation: TValidation) =>
  (
    jsonString: string | undefined,
  ): E.Either<Error | t.Errors, t.TypeOf<TValidation>> =>
    F.pipe(
      jsonString,
      E.fromPredicate(
        (str): str is string => (str?.length ?? 0) > 0,
        () => new Error("Given string must not be undefined or empty."),
      ),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      E.chain((str) => E.tryCatch(() => JSON.parse(str), E.toError)),
      E.chainW((configAsUnvalidated) => validation.decode(configAsUnvalidated)),
    );

/**
 * Creates callback which will validate given optional `string` values by checking that they are non-empty `string`s, parsing them as JSON, and then validating the value using given `io-ts` validator.
 * If any error occurs, it will be thrown directly from the callback.
 * @param validation The `io-ts` validator object.
 * @returns Callback which will ensure that given input is non-empty `string`, attempt to parse JSON as string, and then validate it using given `validation`.
 * The callback will either return validated value as-is, or `throw` an error.
 */
export const validateFromStringifiedJSONOrThrow = <TValidation extends t.Mixed>(
  validation: TValidation,
): ((jsonString: string | undefined) => t.TypeOf<TValidation>) =>
  F.flow(
    validateFromStringifiedJSON(validation),
    E.getOrElse<Error | t.Errors, t.TypeOf<TValidation>>((e) => {
      throw new Error(`Configuration was invalid: ${e}`);
    }),
  );
