import { function as F, either as E } from "fp-ts";
import * as t from "io-ts";

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

export const validateFromStringifiedJSONOrThrow = <TValidation extends t.Mixed>(
  validation: TValidation,
): ((jsonString: string | undefined) => t.TypeOf<TValidation>) =>
  F.flow(
    validateFromStringifiedJSON(validation),
    E.getOrElse<Error | t.Errors, t.TypeOf<TValidation>>((e) => {
      throw new Error(`Configuration was invalid: ${e}`);
    }),
  );
