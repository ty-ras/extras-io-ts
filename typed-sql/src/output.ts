/* eslint-disable @typescript-eslint/ban-types */
import * as t from "io-ts";
import { function as F, taskEither as TE } from "fp-ts";
import type * as query from "./input";

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

export const many = <TValidation extends t.Mixed>(singleRow: TValidation) =>
  t.array(singleRow, "Rows");

export const validateRows =
  <TValidation extends t.Mixed>(
    validation: TValidation,
  ): (<TError, TClient, TParameters>(
    executor: query.SQLQueryExecutor<
      TError,
      TClient,
      TParameters,
      Array<unknown>
    >,
  ) => query.SQLQueryExecutor<
    TError | t.Errors,
    TClient,
    TParameters,
    t.TypeOf<TValidation>
  >) =>
  (executor) => {
    function retVal(parameters: ParametersOf<typeof executor>) {
      return (client: ClientOf<typeof executor>) =>
        F.pipe(
          client,
          executor(parameters),
          TE.chainW((rows) => TE.fromEither(validation.decode(rows))),
        );
    }
    retVal.sqlString = executor.sqlString;
    return retVal;
  };

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
type ParametersOf<
  TExecutor extends query.SQLQueryExecutor<any, any, any, any>,
> = TExecutor extends query.SQLQueryExecutor<
  infer _0,
  infer _1,
  infer TParameters,
  infer _2
>
  ? TParameters
  : never;

type ClientOf<TExecutor extends query.SQLQueryExecutor<any, any, any, any>> =
  TExecutor extends query.SQLQueryExecutor<
    infer _0,
    infer TClient,
    infer _1,
    infer _2
  >
    ? TClient
    : never;
