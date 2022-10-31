/* eslint-disable @typescript-eslint/ban-types */
import * as t from "io-ts";
import { function as F, either as E, taskEither as TE } from "fp-ts";
import * as parameters from "./parameters";
import * as errors from "./errors";

export function executeSQLQuery(
  template: TemplateStringsArray,
): SQLQueryInformation<void>;
export function executeSQLQuery<
  TArgs extends [
    parameters.SQLTemplateParameter,
    ...Array<parameters.SQLTemplateParameter>,
  ],
>(
  template: TemplateStringsArray,
  ...args: TArgs
): SQLQueryInformation<
  TArgs[number] extends parameters.SQLRaw ? void : SQLParameterReducer<TArgs>
>;
export function executeSQLQuery<
  TArgs extends Array<parameters.SQLTemplateParameter>,
>(
  template: TemplateStringsArray,
  ...args: TArgs
): SQLQueryInformation<void | SQLParameterReducer<TArgs>> {
  const { parameterValidation, parameterNames } =
    getParameterValidationAndNames(args);

  return ({ constructParameterReference, executeQuery }) => {
    let parameterIdx = 0;
    const queryString = constructTemplateString(template, args, (arg) => {
      let thisFragment: string;
      if (parameters.isSQLParameter(arg)) {
        thisFragment = constructParameterReference(parameterIdx++, arg);
      } else {
        thisFragment = arg.rawSQL;
      }
      return thisFragment;
    });

    return (client, queryParameters) => {
      const validationResult = parameterValidation.decode(queryParameters);
      return F.pipe(
        // We have to do this silly thing instead of directly calling TE.fromEither(parameterValidation.decode) because TS compiler doesn't properly combine
        // Right<X> | Right<Y> into Right<X|Y>
        TE.fromEither(
          validationResult._tag === "Right"
            ? E.right(validationResult.right)
            : validationResult,
        ),
        TE.chainW((validatedParameters) =>
          executeQuery(
            client,
            queryString,
            parameterNames.map(
              (parameterName) =>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                validatedParameters[
                  parameterName as keyof typeof validatedParameters
                ],
            ),
          ),
        ),
      );
    };
  };
}

export type SQLParameterReducer<
  Arr extends Array<unknown>,
  Result extends Record<string, unknown> = {},
  Index extends number[] = [],
> = Arr extends []
  ? Result
  : Arr extends [infer Head, ...infer Tail]
  ? SQLParameterReducer<
      [...Tail],
      Result &
        (Head extends parameters.SQLParameter<infer TName, infer TValidation>
          ? Record<TName, t.TypeOf<TValidation>>
          : {}),
      [...Index, 1]
    >
  : Readonly<Result>;

export type SQLQueryInformation<TParameters> = <TError, TClient>(
  clientInformation: SQLClientInformation<TError, TClient>,
) => SQLQueryExecutor<TError | t.Errors, TClient, TParameters, Array<unknown>>;

export interface SQLClientInformation<TError, TClient> {
  constructParameterReference: (
    parameterIndex: number,
    parameter: parameters.SQLParameter<string, t.Mixed>,
  ) => string;
  executeQuery: (
    client: TClient,
    sqlString: string,
    parameters: Array<unknown>,
  ) => TE.TaskEither<TError, Array<unknown>>;
}

export type SQLQueryExecutor<TError, TClient, TParameters, TReturnType> = (
  client: TClient,
  parameters: TParameters,
) => TE.TaskEither<TError, TReturnType>;

const constructTemplateString = <T>(
  fragments: TemplateStringsArray,
  args: ReadonlyArray<T>,
  transformArg: (arg: T, fragment: string) => string,
) =>
  fragments.reduce(
    (curString, fragment, idx) =>
      `${curString}${fragment}${
        idx >= args.length ? "" : transformArg(args[idx], fragment)
      }`,
    "",
  );

const getParameterValidationAndNames = (
  args: ReadonlyArray<parameters.SQLTemplateParameter>,
) => {
  const { parameterInstances, props } = args.reduce<{
    parameterInstances: Array<parameters.SQLParameter<string, t.Mixed>>;
    props: t.Props;
  }>(
    (state, arg, idx) => {
      if (parameters.isSQLParameter(arg)) {
        const parameterName = arg.parameterName;
        if (parameterName in state.props) {
          throw new errors.DuplicateSQLParameterNameError(parameterName);
        } else {
          state.parameterInstances.push(arg);
          state.props[parameterName] = arg.validation;
        }
      } else if (!parameters.isRawSQL(arg)) {
        throw new errors.InvalidSQLTemplateArgumentError(idx);
      }
      return state;
    },
    { parameterInstances: [], props: {} },
  );
  const parameterValidation =
    parameterInstances.length > 0 ? t.type(props, "SQLParameters") : t.void;
  return {
    parameterValidation,
    parameterNames: parameterInstances.map((p) => p.parameterName),
  };
};
