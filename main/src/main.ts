import { function as F, either as E, taskEither as TE } from "fp-ts";

export function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
): Promise<void>;
export function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
  skipExitingAlways: false,
): Promise<1 | 0>;
export async function invokeMain<E, T>(
  getMainTask: F.Lazy<TE.TaskEither<E, T>>,
  skipExitingAlways = false,
): Promise<void | 1 | 0> {
  let exitCode = 1;
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
  if (!skipExitingAlways || exitCode !== 0) {
    process.exit(exitCode);
  }
  return exitCode;
}
