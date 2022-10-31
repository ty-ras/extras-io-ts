/* eslint-disable @typescript-eslint/ban-types */
import type * as t from "io-ts";

export type SQLTemplateParameter = AnySQLParameter | SQLRaw;

export type AnySQLParameter = SQLParameter<string, t.Mixed>;

export class SQLRaw {
  public constructor(public readonly rawSQL: string) {}
}

export class SQLParameter<TName extends string, TValidation extends t.Mixed> {
  public constructor(
    public readonly parameterName: TName,
    public readonly validation: TValidation,
  ) {}
}

export const raw = (str: string) => new SQLRaw(str);

export const parameter = <TName extends string, TValidation extends t.Mixed>(
  name: TName,
  validation: TValidation,
) => new SQLParameter(name, validation);

export const isSQLParameter = (
  templateParameter: SQLTemplateParameter,
): templateParameter is AnySQLParameter =>
  templateParameter instanceof SQLParameter;

export const isRawSQL = (
  templateParameter: SQLTemplateParameter,
): templateParameter is SQLRaw => templateParameter instanceof SQLRaw;
