import { type function as F, either as E, type taskEither as TE } from "fp-ts";

/**
 * Calls given callback to acquire `TaskEither` and then `await`s it.
 * Once it is done, calls `process.exit` with exit code:
 * - `0` if `TaskEither` returned `Right`, or
 * - `1` if `TaskEither` returned `Left`.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning `Left`, that will be catched and interpreted as `Left`.
 * @param getMainTask The callback to get `TaskEither` to execute.
 */
export function invokeMain<TError, TResult>(
  getMainTask: F.Lazy<TE.TaskEither<TError, TResult>>,
): Promise<void>;
/**
 * Calls given callback to acquire `TaskEither` and then `await`s it.
 * Once it is done, calls `process.exit` only if the result is `Left`.
 * Finally, returns the exit code.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning `Left`, that will be catched and interpreted as `Left`.
 * @param getMainTask The callback to get `TaskEither` to execute.
 * @param skipExitingAlways Set to `false` in order to skip calling `process.exit` on successful invocations (result is `Right`).
 */
export function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
  skipExitingAlways: false,
): Promise<1 | 0>;
/* c8 ignore start */
export async function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
  skipExitingAlways: false = false,
): Promise<void | 1 | 0> {
  const { callProcessExit, exitCode } = await invokeMainAndGetInfo(
    getMainTask,
    skipExitingAlways,
  );
  if (callProcessExit) {
    process.exit(exitCode);
  }
  return exitCode;
}
/* c8 ignore stop */

/**
 * Auxiliary function to call given callback to acquire `TaskEither`, `await` on it, and return information indicating exit code and whether `process.exit` should be called.
 *
 * Notice that given callback is inside `try` block so even if it actually `throw`s instead of returning `Left`, that will be catched and interpreted as `Left`.
 * @param getMainTask The callback to get `TaskEither` to execute.
 * @param skipExitingAlways Set to `false` in order to result `callProcessExit` to be `false` even when there are no errors.
 * @returns Information used by {@link invokeMain}
 */
export const invokeMainAndGetInfo = async <TError, TResult>(
  getMainTask: F.Lazy<TE.TaskEither<TError, TResult>>,
  skipExitingAlways?: false,
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
    callProcessExit: skipExitingAlways !== false || exitCode !== 0,
    exitCode,
  };
};
