/**
 * @file This file contains internal code related to functionality of resource pools.
 */

import {
  function as F,
  option as O,
  array as A,
  readonlyArray as RA,
  either as E,
  taskEither as TE,
} from "fp-ts";
import type * as api from "./api.types";
import * as errors from "./errors";
import * as state from "./state";

/**
 * Creates {@link api.ResourceAcquire} that can be used as {@link api.ResourcePool#acquire}.
 * @param poolState The {@link ResourcePoolState}.
 * @param create The {@link ResourceCreateTask} to use to create resources.
 * @returns The {@link api.ResourceAcquire} that can be used as {@link api.ResourcePool#acquire}.
 */
export const createAcquire =
  <TResource>(
    poolState: state.ResourcePoolState<TResource>,
    create: api.ResourceCreateTask<TResource>,
  ): api.ResourceAcquire<TResource, void> =>
  () =>
    F.pipe(
      poolState.resources,
      // Find first free resource (and map from "Resource<T> | undefined" to "Resource<T>")
      A.findFirstMap((r) =>
        r && r.returnedAt !== undefined ? O.some(r) : O.none,
      ),
      // If found, then mark as reserved
      O.chainFirst((r) => ((r.returnedAt = undefined), O.some("ignored"))),
      O.getOrElseW(() =>
        // If not found, then start process of creating new one
        F.pipe(
          // Check that we have room for new resource
          isRoomForResource(poolState.maxCount, poolState.resources),
          E.fromPredicate(
            F.identity,
            () =>
              new errors.ResourcePoolFullError(
                "Resource pool max capacity reached",
              ),
          ),
          // Deduce the index where to store the resource to be created
          E.map(() =>
            F.pipe(
              poolState.resources,
              RA.findIndex((r) => r === null),
              O.getOrElse(() => poolState.resources.length),
            ),
          ),
          // Before doing async, mark that we have reserved this array slot for future use
          E.chainFirst((idx) => E.of((poolState.resources[idx] = undefined))),
          TE.fromEither,
          // Acquire resource by calling callback
          TE.chainW((idx) =>
            F.pipe(
              create(),
              TE.bimap(
                (error) => ({ error, idx }),
                (resource) => ({ resource, idx }),
              ),
            ),
          ),
          // Perform cleanup and extract resource
          TE.bimap(
            (err) => {
              // We have errored -> clean up reserved slot if needed
              const isError = err instanceof Error;
              if (!isError) {
                poolState.resources[err.idx] = null;
              }
              // Return Error object
              return isError ? err : err.error;
            },
            ({ idx, resource }) => {
              // We have succeeded -> save the result
              poolState.resources[idx] = new state.Resource(resource);
              // Return the resource
              return resource;
            },
          ),
        ),
      ),
      // Lift sync version to async
      (resourceOrTask) =>
        resourceOrTask instanceof state.Resource
          ? TE.of<Error, TResource>(resourceOrTask.resource)
          : resourceOrTask,
    );

/**
 * Creates {@link api.ResourceRelease} that can be used as {@link api.ResourcePool#release}.
 * @param state The {@link ResourcePoolState}.
 * @returns The {@link api.ResourceRelease} that can be used as {@link api.ResourcePool#release}.
 */
export const createRelease =
  <TResource>(
    state: state.ResourcePoolState<TResource>,
  ): api.ResourceRelease<TResource> =>
  (resource) =>
    F.pipe(
      state.resources,
      // Find the resource from state
      A.findFirstMap((r) =>
        r && r.returnedAt === undefined && state.equality(r.resource, resource)
          ? O.some(r)
          : O.none,
      ),
      // Create error if not found
      E.fromOption(
        () =>
          new errors.ResourceNotPartOfPoolError(
            "Given resource was not part of this pool",
          ),
      ),
      // Remember when it was returned
      E.chainFirst((r) => ((r.returnedAt = Date.now()), E.right("ignored"))),
      TE.fromEither,
      // Map success (resource) to void
      TE.map(() => {}),
    );

const isRoomForResource = (
  maxCount: number | undefined,
  array: ReadonlyArray<state.ResourcePoolStateArrayItem<unknown>>,
) =>
  maxCount === undefined ||
  array.length < maxCount ||
  getCurrentResourceCount(array) < maxCount;

/**
 * Gets the amount of resources (idle and acquired) of the pool.
 * @param array The array from {@link state.ResourcePoolState#resources}.
 * @returns The amount of resources (values other than `null`) in the given array.
 */
export const getCurrentResourceCount = (
  array: ReadonlyArray<state.ResourcePoolStateArrayItem<unknown>>,
) =>
  F.pipe(
    array,
    RA.reduce(0, (nonNullCount, r) => nonNullCount + (r === null ? 0 : 1)),
  );
