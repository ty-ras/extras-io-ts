/**
 * @file This file contains code related to validating output of {@link input.SQLQueryExecutor}.
 */

/* eslint-disable @typescript-eslint/ban-types */
import * as t from "io-ts";
import { function as F, either as E, taskEither as TE } from "fp-ts";
import type * as input from "./input";
import * as errors from "./errors";

/**
 * Creates `io-ts` validator which ensures that input array of rows contains exactly one row with given shape.
 * @param singleRow The `io-ts` validator for row object.
 * @returns The `io-ts` validator which takes an array of rows as input, and ensures that array contains exactly one element. That element is then validated using given validator.
 */
export const one = <TValidation extends t.Mixed>(singleRow: TValidation) =>
  many(singleRow).pipe<
    t.TypeOf<TValidation>,
    Array<t.TypeOf<TValidation>>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    Array<t.TypeOf<TValidation>>
  >(
    new t.Type(
      singleRow.name,
      (u): u is t.TypeOf<TValidation> => singleRow.is(u),
      (i, context) =>
        i.length === 1
          ? t.success(i[0])
          : t.failure(
              i,
              context,
              "Array was empty or contained more than one element",
            ),
      (a) => [a],
    ),
  );

/**
 * Creates `io-ts` validator which ensures that all rows of input array match given shape.
 * @param singleRow The `io-ts` validator for row object.
 * @returns The `io-ts` validator which takes an array of rows as input, and ensures that all array elements adher to given validator. The array length is not checked.
 */
export const many = <TValidation extends t.Mixed>(singleRow: TValidation) =>
  t.array(singleRow, "Rows");

/**
 * Creates callback to transform the input {@link input.SQLQueryExecutor} into another {@link input.SQLQueryExecutor}. This resulting executor will validate the return value of input executor using the given `io-ts` validation.
 * @param validation The `io-ts` validation, typically obtained via {@link one} or {@link many}.
 * @returns The callback which transforms the input {@link input.SQLQueryExecutor} into another {@link input.SQLQueryExecutor}. This resulting executor will validate the return value of input executor using the given `io-ts` validation.
 */
export const validateRows =
  <TValidation extends t.Mixed>(
    validation: TValidation,
  ): (<TClient, TParameters>(
    executor: input.SQLQueryExecutor<TClient, TParameters, Array<unknown>>,
  ) => input.SQLQueryExecutor<TClient, TParameters, t.TypeOf<TValidation>>) =>
  (executor) => {
    function retVal(parameters: ParametersOf<typeof executor>) {
      return (client: ClientOf<typeof executor>) =>
        F.pipe(
          client,
          executor(parameters),
          TE.chainEitherKW((rows) =>
            F.pipe(
              validation.decode(rows),
              E.mapLeft(
                (validationError) =>
                  new errors.SQLQueryOutputValidationError(validationError),
              ),
            ),
          ),
        );
    }
    retVal.sqlString = executor.sqlString;
    return retVal;
  };

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
type ParametersOf<TExecutor extends input.SQLQueryExecutor<any, any, any>> =
  TExecutor extends input.SQLQueryExecutor<
    infer _1,
    infer TParameters,
    infer _2
  >
    ? TParameters
    : never;

type ClientOf<TExecutor extends input.SQLQueryExecutor<any, any, any>> =
  TExecutor extends input.SQLQueryExecutor<infer TClient, infer _1, infer _2>
    ? TClient
    : never;
