/**
 * @file This file contains logic related to retry functionality when acquiring resources from the resource pool.
 */

import { function as F, either as E, taskEither as TE } from "fp-ts";
import type * as api from "./api.types";
import * as errors from "./errors";

/**
 * Creates new callback which will augment the resource pools it receives with retry functionality, parametrized by given input.
 *
 * If `retryFunctionality` is of type {@link StaticRetryFunctionality}, and its `retryCount` property is `0` or less, then the returned function will be a no-op.
 * And if the `waitBeforeRetryMs` property is `0` or less, there will be no waiting, but retry logic will commence immediately.
 * @param retryFunctionality The retry logic, either as static object, or as a callback.
 * @returns A callback which can be used to augment any {@link api.ResourcePool} with retry logic.
 * @see RetryFunctionality
 * @see StaticRetryFunctionality
 * @see DynamicRetryFunctionality
 */
export const augmentWithRetry =
  (
    retryFunctionality: RetryFunctionality,
  ): (<TResource, TAcquireParameters>(
    pool: api.ResourcePool<TResource, TAcquireParameters>,
  ) => api.ResourcePool<TResource, TAcquireParameters>) =>
  (pool) => {
    const getRetryInfo: DynamicRetryFunctionality | undefined =
      typeof retryFunctionality === "function"
        ? retryFunctionality
        : dynamicFromStatic(retryFunctionality);
    return getRetryInfo
      ? new PoolWithRetryFunctionality(getOriginalPool(pool), getRetryInfo)
      : pool;
  };

/**
 * Checks whether given {@link api.ResourcePool} has already been augmented with retry functionality using {@link augmentWithRetry}.
 * @param pool The given {@link api.ResourcePool}
 * @returns `true` if the given pool has already been augmented with retry functionality, `false` otherwise.
 */
export const poolIsWithRetryFunctionality = <TResource, TAcquireParameters>(
  pool: api.ResourcePool<TResource, TAcquireParameters>,
) => pool instanceof PoolWithRetryFunctionality;

/**
 * The input for {@link augmentWithRetry}.
 * @see StaticRetryFunctionality
 * @see DynamicRetryFunctionality
 */
export type RetryFunctionality =
  | StaticRetryFunctionality
  | DynamicRetryFunctionality;

/**
 * The information required by retry functionality.
 */
export interface RetryParameters {
  /**
   * How long to wait before attempting to acquire again.
   */
  waitBeforeRetryMs: number;
}

/**
 * Describes the retry logic using some variables.
 * Notice that the retry logic created from these variables will only react if the error thrown by `acquire` of {@link api.ResourcePool} is of type {@link errors.ResourcePoolFullError}.
 * If more complex retry logic is needed, consider using {@link DynamicRetryFunctionality}.
 */
export type StaticRetryFunctionality = RetryParameters & { retryCount: number };

/**
 * Callback to decide whether to retry again or not, whenever acquiring a resource "throws" an error.
 * The result of this callback should be {@link Error} if no more retrying should be done.
 * Otherwise, an object {@link RetryParameters} should be returned to instruct how long to wait until retrying again.
 */
export type DynamicRetryFunctionality = (
  args: DynamicRetryFunctionalityArgs,
) => RetryParameters | Error;

/**
 * The input for {@link DynamicRetryFunctionality}.
 */
export interface DynamicRetryFunctionalityArgs {
  /**
   * The error that occurred during call to {@link api.ResourcePool#acquire}.
   */
  error: Error;
  /**
   * Notice! This count is 1-based!
   * So on the first call, the value of this will be 1.
   */
  attemptCount: number;
}

const acquireWithRetry = async <TResource, TAcquireParameters>(
  acquire: api.ResourceAcquire<TResource, TAcquireParameters>,
  args: TAcquireParameters,
  retryFunctionality: DynamicRetryFunctionality,
) => {
  let maybeResource: E.Either<Error, TResource>;
  let retryParams: RetryParameters | Error | undefined;
  let attemptCount = 0;
  do {
    ++attemptCount;
    try {
      maybeResource = await acquire(args)();
    } catch (thrownError) {
      maybeResource = E.left(E.toError(thrownError));
    }
    retryParams = E.isLeft(maybeResource)
      ? retryFunctionality({ error: maybeResource.left, attemptCount })
      : undefined;
    if (retryParams) {
      if (retryParams instanceof Error) {
        maybeResource = E.left(retryParams);
        retryParams = undefined;
      } else {
        const timeout = retryParams.waitBeforeRetryMs;
        if (timeout > 0) {
          // Avoid extra setTimeout calls
          await new Promise<void>((resolve) => setTimeout(resolve, timeout));
        }
      }
    }
  } while (retryParams !== undefined);
  return TE.fromEither(maybeResource);
};

const dynamicFromStatic = ({
  waitBeforeRetryMs,
  ...args
}: StaticRetryFunctionality): DynamicRetryFunctionality | undefined => {
  const retryCount = Math.max(args.retryCount, 0);
  return retryCount > 0
    ? ({ attemptCount, error }) =>
        error instanceof errors.ResourcePoolFullError
          ? attemptCount > retryCount
            ? new errors.NoMoreRetriesLeftError(attemptCount, error)
            : { waitBeforeRetryMs }
          : error
    : undefined;
};

class PoolWithRetryFunctionality<TResource, TAcquireParameters>
  implements api.ResourcePool<TResource, TAcquireParameters>
{
  public constructor(
    public readonly __originalPool: api.ResourcePool<
      TResource,
      TAcquireParameters
    >,
    retryFunctionality: DynamicRetryFunctionality,
  ) {
    const { acquire, release } = __originalPool;
    this.acquire = (args) =>
      F.pipe(
        TE.tryCatch(
          async () => await acquireWithRetry(acquire, args, retryFunctionality),
          E.toError,
        ),
        TE.flatten,
      );
    this.release = release;
  }
  acquire: api.ResourceAcquire<TResource, TAcquireParameters>;
  release: api.ResourceRelease<TResource>;
}

const getOriginalPool = <TResource, TAcquireParameters>(
  pool: api.ResourcePool<TResource, TAcquireParameters>,
): api.ResourcePool<TResource, TAcquireParameters> =>
  pool instanceof PoolWithRetryFunctionality ? pool.__originalPool : pool;
