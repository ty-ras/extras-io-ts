/**
 * @file This file contains functionality related to invoking asynchronous functions as program main functions, calling `process.exit` as necessary after they have completed.
 */

import { type function as F, either as E, type taskEither as TE } from "fp-ts";
import * as process from "node:process";

/**
 * Calls given callback to acquire {@link TE.TaskEither} and then `await`s it.
 * Once it is done, calls `process.exit` with exit code:
 * - `0` if {@link TE.TaskEither} returned {@link E.Right}, or
 * - `1` if {@link TE.TaskEither} returned {@link E.Left}.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning {@link E.Left}, that will be catched and interpreted as {@link E.Left}.
 * @param getMainTask The callback to get {@link TE.TaskEither} to execute.
 * @returns Asynchronously returns nothing.
 */
export function invokeMain<TError, TResult>(
  getMainTask: F.Lazy<TE.TaskEither<TError, TResult>>,
): Promise<void>;

/**
 * Calls given callback to acquire {@link TE.TaskEither} and then `await`s it.
 * Once it is done, calls `process.exit` only if the result is {@link E.Left} or an error is thrown.
 * Finally, returns the exit code.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning {@link E.Left}, that will be catched and interpreted as {@link E.Left}.
 * @param getMainTask The callback to get {@link TE.TaskEither} to execute.
 * @param dontCallProcessExit Set to `true` in order to skip calling `process.exit` on successful invocations (result is {@link E.Right}).
 * @returns Asynchronously returns either `0` or `1`. The value `0` is returned if there were no errors thrown or returned via {@link E.Either} or {@link TE.TaskEither}. Returns `1` otherwise.
 */
export function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
  dontCallProcessExit: true,
): Promise<1 | 0>;
/* c8 ignore start */

/**
 * Calls given callback to acquire {@link TE.TaskEither} and then `await`s it.
 * Once it is done, calls `process.exit` only if the result is {@link E.Left} or an error is thrown.
 * Finally, returns the exit code.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning {@link E.Left}, that will be catched and interpreted as {@link E.Left}.
 * @param getMainTask The callback to get {@link TE.TaskEither} to execute.
 * @param dontCallProcessExit Set to `true` in order to skip calling `process.exit` on successful invocations (result is {@link E.Right}).
 * @returns Asynchronously returns either `0` or `1`. The value `0` is returned if there were no errors thrown or returned via {@link E.Either} or {@link TE.TaskEither}. Returns `1` otherwise.
 */
export async function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
  dontCallProcessExit?: boolean,
): Promise<void | 1 | 0> {
  const { callProcessExit, exitCode } = await invokeMainAndGetInfo(
    getMainTask,
    dontCallProcessExit,
  );
  if (callProcessExit) {
    process.exit(exitCode);
  }
  return exitCode;
}
/* c8 ignore stop */

/**
 * Auxiliary function to call given callback to acquire {@link TE.TaskEither}, `await` on it, and return information indicating exit code and whether `process.exit` should be called.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning {@link E.Left}, that will be catched and interpreted as {@link E.Left}.
 * @param getMainTask The callback to get {@link TE.TaskEither} to execute.
 * @param dontCallProcessExit Set to `true` in order to result `callProcessExit` to be `false` even when there are no errors.
 * @returns Information used by {@link invokeMain}
 */
export const invokeMainAndGetInfo = async <TError, TResult>(
  getMainTask: F.Lazy<TE.TaskEither<TError, TResult>>,
  dontCallProcessExit?: boolean,
) => {
  let exitCode: 1 | 0 = 1;
  try {
    const resultOrError = await getMainTask()();
    if (E.isRight(resultOrError)) {
      exitCode = 0;
    } else {
      throw resultOrError.left;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error", e);
  }
  return {
    callProcessExit: dontCallProcessExit !== true || exitCode !== 0,
    exitCode,
  };
};
