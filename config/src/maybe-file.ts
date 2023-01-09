import { either as E, taskEither as TE, function as F } from "fp-ts";
import * as t from "io-ts";
import * as fs from "fs/promises";

/**
 * Notice that in order for `stringValue` to be recognized as file path, it must start with either `"."` or `"/"` character.
 * @param stringValue String value which will be interpreted as inline JSON or path to file containing JSON.
 * @returns A task which either contains error, or string.
 */
export const getJSONStringValueFromStringWhichIsJSONOrFilename = (
  stringValue: string,
): TE.TaskEither<Error | t.Errors, string> =>
  F.pipe(
    // Check that it is actually non-empty string.
    nonEmptyString.decode(stringValue),
    // Check the string contents - should we treat it as JSON string or path to file?
    // We use chainW instead of map because we return Either, and chainW = map + flatten (+ 'W'iden types)
    E.chainW(extractConfigStringType),
    // We may need to use async now (in case of file path), so lift Either into TaskEither (Promisified version of Either)
    TE.fromEither,
    // Invoke async callback
    TE.chainW(({ type, str }) =>
      TE.tryCatch(
        async () =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          type === "JSON" ? str : await fs.readFile(str, "utf8"),
        E.toError,
      ),
    ),
  );

type ConfigStringType = { type: "JSON" | "file"; str: string };

const JSON_STARTS_REGEX = /^\W*(\{|\[|"|t|f|\d|-|n)/;

const FILE_STARTS = [".", "/"];

const extractConfigStringType = (
  configString: string,
): E.Either<Error, ConfigStringType> =>
  JSON_STARTS_REGEX.test(configString)
    ? E.right({
        type: "JSON",
        str: configString,
      })
    : FILE_STARTS.some((s) => configString.startsWith(s))
    ? E.right({
        type: "file",
        str: configString,
      })
    : E.left(
        new Error(
          `The env variable string must start with one of the following: ${[
            JSON_STARTS_REGEX.source,
            ...FILE_STARTS,
          ]
            .map((s) => `"${s}"`)
            .join(",")}.`,
        ),
      );

const nonEmptyString = t.refinement(
  t.string,
  (str) => str.length > 0,
  "JSONOrFilenameString",
);
