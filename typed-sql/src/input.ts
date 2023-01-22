/* eslint-disable @typescript-eslint/ban-types */
import * as t from "io-ts";
import { function as F, taskEither as TE } from "fp-ts";
import * as parameters from "./parameters";
import * as errors from "./errors";

export function prepareSQL(
  template: TemplateStringsArray,
): SQLQueryInformation<void>;
export function prepareSQL<
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
export function prepareSQL<
  TArgs extends Array<parameters.SQLTemplateParameter>,
>(
  template: TemplateStringsArray,
  ...args: TArgs
): SQLQueryInformation<void | SQLParameterReducer<TArgs>> {
  const {
    parameterValidation,
    parameterNames,
    templateIndicesToParameterIndices,
  } = getParameterValidationAndNames(args);

  return ({ constructParameterReference, executeQuery }) => {
    const queryString = constructTemplateString(template, args, (argIdx) => {
      let thisFragment: string;
      const arg = args[argIdx];
      if (parameters.isSQLParameter(arg)) {
        const parameterIndex = templateIndicesToParameterIndices[argIdx];
        if (parameterIndex === undefined) {
          throw new Error(
            `Internal error: parameter index for template arg at ${argIdx} was not defined when it should've been.`,
          );
        }
        thisFragment = constructParameterReference(parameterIndex, arg);
      } else {
        thisFragment = arg.rawSQL;
      }
      return thisFragment;
    });

    // It is possible to do this also via Object.assign
    // https://stackoverflow.com/questions/12766528/build-a-function-object-with-properties-in-typescript
    // However, I think this way is nicer.
    // It is from https://bobbyhadz.com/blog/typescript-assign-property-to-function
    function executor(queryParameters: void | SQLParameterReducer<TArgs>) {
      return (client: Parameters<typeof executeQuery>[0]) => {
        // We have to do explicit typing because TS compiler doesn't properly combine
        // Right<X> | Right<Y> into Right<X|Y>
        return F.pipe(
          TE.fromEither<t.Errors, void | { [x: string]: unknown }>(
            parameterValidation.decode(queryParameters),
          ),
          TE.chainW((validatedParameters) =>
            executeQuery(
              client,
              queryString,
              parameterNames.map(
                (parameterName) =>
                  validatedParameters[
                    parameterName as keyof typeof validatedParameters
                  ],
              ),
            ),
          ),
        );
      };
    }
    executor.sqlString = queryString;
    return executor;
  };
}

// Tuple reducer spotted from https://stackoverflow.com/questions/69085499/typescript-convert-tuple-type-to-object
export type SQLParameterReducer<
  Arr extends Array<unknown>,
  Result extends Record<string, unknown> = {},
> = Arr extends []
  ? Result
  : Arr extends [infer Head, ...infer Tail]
  ? SQLParameterReducer<
      [...Tail],
      Result &
        (Head extends parameters.SQLParameter<infer TName, infer TValidation>
          ? Record<TName, t.TypeOf<TValidation>>
          : {})
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

export type SQLQueryExecutor<TError, TClient, TParameters, TReturnType> =
  SQLQueryExecutorFunction<TError, TClient, TParameters, TReturnType> &
    WithSQLString;

export interface WithSQLString {
  readonly sqlString: string;
}

export type SQLQueryExecutorFunction<
  TError,
  TClient,
  TParameters,
  TReturnType,
> = (
  parameters: TParameters,
) => (client: TClient) => TE.TaskEither<TError, TReturnType>;

const constructTemplateString = <T>(
  fragments: TemplateStringsArray,
  args: ReadonlyArray<T>,
  transformArg: (idx: number, fragment: string) => string,
) =>
  fragments.reduce(
    (curString, fragment, idx) =>
      `${curString}${fragment}${
        idx >= args.length ? "" : transformArg(idx, fragment)
      }`,
    "",
  );

const getParameterValidationAndNames = (
  args: ReadonlyArray<parameters.SQLTemplateParameter>,
) => {
  const { parameterInstances, props, templateIndicesToParameterIndices } =
    args.reduce<{
      parameterInstances: Array<parameters.SQLParameter<string, t.Mixed>>;
      props: t.Props;
      templateIndicesToParameterIndices: Array<number | undefined>;
      namesToIndices: Record<string, number>;
    }>(
      (state, arg, idx) => {
        let paramIdx: number | undefined;
        if (parameters.isSQLParameter(arg)) {
          const parameterName = arg.parameterName;
          const existing = state.props[parameterName];
          if (existing) {
            if (arg.validation === existing) {
              paramIdx = state.namesToIndices[parameterName];
            } else {
              throw new errors.DuplicateSQLParameterNameError(parameterName);
            }
          } else {
            paramIdx = state.parameterInstances.length;
            state.parameterInstances.push(arg);
            state.namesToIndices[parameterName] = paramIdx;
            state.props[parameterName] = arg.validation;
          }
        } else if (!parameters.isRawSQL(arg)) {
          throw new errors.InvalidSQLTemplateArgumentError(idx);
        }
        state.templateIndicesToParameterIndices.push(paramIdx);
        return state;
      },
      {
        parameterInstances: [],
        props: {},
        templateIndicesToParameterIndices: [],
        namesToIndices: {},
      },
    );
  const parameterValidation =
    parameterInstances.length > 0 ? t.type(props, "SQLParameters") : t.void;
  return {
    parameterValidation,
    parameterNames: parameterInstances.map((p) => p.parameterName),
    templateIndicesToParameterIndices,
  };
};
