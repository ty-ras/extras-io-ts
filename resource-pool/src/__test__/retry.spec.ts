/**
 * @file This file contains unit tests for functionality in file `../retry.ts`.
 */

import test from "ava";
import { function as F, either as E, taskEither as TE } from "fp-ts";
import * as spec from "../retry";
import type * as api from "../api.types";
import * as errors from "../errors";

test("Validate that retry works after one failed call", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = F.pipe(
    succeedAfter(1, tracker),
    spec.augmentWithRetry({ retryCount: 1, waitBeforeRetryMs: 0 }),
  );
  c.deepEqual(await pool.acquire()(), E.right(RESOURCE));
  c.deepEqual(tracker, { acquireCalled: 2 });
});

test("Validate that retry works when all calls fail", async (c) => {
  c.plan(3);
  const tracker = makeTracker();
  const pool = F.pipe(
    succeedAfter(3, tracker),
    spec.augmentWithRetry({ retryCount: 2, waitBeforeRetryMs: 0 }),
  );
  const result = await pool.acquire()();
  if (E.isLeft(result)) {
    c.true(result.left instanceof errors.NoMoreRetriesLeftError);
    c.deepEqual(result.left.message, "Error after attempting 3 times.");
  }
  c.deepEqual(tracker, { acquireCalled: 3 });
});

test("Validate that retry works even when callback hard-throws an error", async (c) => {
  c.plan(1);
  const message = "This error should be catched";
  const pool = F.pipe<
    api.ResourcePool<string, void>,
    api.ResourcePool<string, void>
  >(
    {
      acquire: () => {
        throw new Error(message);
      },
      release: () => TE.of<Error, void>(undefined),
    },
    spec.augmentWithRetry({ retryCount: 1, waitBeforeRetryMs: 0 }),
  );
  const result = await pool.acquire()();
  if (E.isLeft(result)) {
    c.deepEqual(result.left.message, message);
  }
});

test("Validate that retry works when retry wait time is greater than zero", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = F.pipe(
    succeedAfter(1, tracker),
    spec.augmentWithRetry({ retryCount: 1, waitBeforeRetryMs: 10 }),
  );
  c.deepEqual(await pool.acquire()(), E.right(RESOURCE));
  c.deepEqual(tracker, { acquireCalled: 2 });
});

test("Validate that poolIsWithRetryFunctionality works", (c) => {
  c.plan(3);
  const normalPool = succeedAfter(0, makeTracker());
  const retryPool = spec.augmentWithRetry({
    retryCount: 1,
    waitBeforeRetryMs: 0,
  })(normalPool);
  c.false(spec.poolIsWithRetryFunctionality(normalPool));
  c.true(spec.poolIsWithRetryFunctionality(retryPool));
  c.false(
    spec.poolIsWithRetryFunctionality(
      spec.augmentWithRetry({ retryCount: 0, waitBeforeRetryMs: 0 })(
        normalPool,
      ),
    ),
  );
});

test("Validate that retry works even when augmenting already retry-augmented pool", async (c) => {
  c.plan(2);
  const tracker = makeTracker();
  const pool = F.pipe(
    succeedAfter(2, tracker),
    spec.augmentWithRetry({ retryCount: 1, waitBeforeRetryMs: 10 }),
    spec.augmentWithRetry({ retryCount: 2, waitBeforeRetryMs: 0 }),
  );
  c.deepEqual(await pool.acquire()(), E.right(RESOURCE));
  c.deepEqual(tracker, { acquireCalled: 3 });
});

test("Validate that retry works with dynamic retry logic", async (c) => {
  c.plan(3);
  const tracker = makeTracker();
  const retryTracker: Array<spec.DynamicRetryFunctionalityArgs> = [];
  const error = new Error("This is the error");
  const pool = F.pipe(
    succeedAfter(1, tracker, error),
    spec.augmentWithRetry(
      // Always retry
      (retryArgs) => (retryTracker.push(retryArgs), { waitBeforeRetryMs: 0 }),
    ),
  );
  c.deepEqual(await pool.acquire()(), E.right(RESOURCE));
  c.deepEqual(tracker, { acquireCalled: 2 });
  c.deepEqual(retryTracker, [
    {
      attemptCount: 1,
      error,
    },
  ]);
});

const succeedAfter = (
  count: number,
  track: { acquireCalled: number },
  error?: Error,
): api.ResourcePool<string> => ({
  acquire: () => {
    ++track.acquireCalled;
    const shouldSucceed = --count < 0;
    return shouldSucceed
      ? TE.of(RESOURCE)
      : TE.left(error ?? new errors.ResourcePoolFullError());
  },
  release: () => TE.of(undefined),
});

interface AcquireTracker {
  acquireCalled: number;
}

const makeTracker = (): AcquireTracker => ({ acquireCalled: 0 });

const RESOURCE = "resource";
