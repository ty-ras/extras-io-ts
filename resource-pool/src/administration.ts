/**
 * @file This file contains internal code related to administation of resource pools.
 */

import {
  function as F,
  array as A,
  readonlyArray as RA,
  either as E,
  task as T,
} from "fp-ts";
import type * as api from "./api.types";
import * as state from "./state";

/**
 * Creates implementation for `runEviction` function of {@link api.ResourcePoolAdministration} interface.
 * This function is internal to this library, and not exposed to clients.
 * @param poolState The {@link pool.ResourcePoolState}.
 * @param destroy The callback to destroy one resource.
 * @returns The implementation for `runEviction` function of {@link api.ResourcePoolAdministration} interface.
 */
export const createRunEviction =
  <TResource>(
    poolState: state.ResourcePoolState<TResource>,
    destroy: api.ResourceDestroyTask<TResource>,
  ): api.ResourcePoolAdministration<TResource>["runEviction"] =>
  (resourceIdleTime) => {
    const shouldEvict: api.ResourceIdleTimeCustomizationFunction<TResource> =
      typeof resourceIdleTime === "number"
        ? ({ returnedAt, now }) => now - returnedAt >= resourceIdleTime
        : resourceIdleTime;
    return F.pipe(
      poolState.resources,
      A.reduceWithIndex<
        state.ResourcePoolStateArrayItem<TResource>,
        EvictReduceState<TResource>
      >(
        { now: Date.now(), toBeEvicted: [], toBeRetained: [] },
        (idx, reduceState, r) => {
          if (
            idx >= poolState.minCount &&
            r &&
            r.returnedAt !== undefined &&
            shouldEvict({
              now: reduceState.now,
              returnedAt: r.returnedAt,
              resource: r.resource,
            })
          ) {
            reduceState.toBeEvicted.push(r.resource);
          } else if (r !== null) {
            reduceState.toBeRetained.push(r);
          }
          return reduceState;
        },
      ),
      ({ toBeEvicted, toBeRetained }) => {
        poolState.resources = toBeRetained;
        return toBeEvicted;
      },
      T.traverseArray(destroy),
      T.map((results) => ({
        resourcesDeleted: results.length,
        errors: F.pipe(
          results,
          RA.filter(E.isLeft),
          RA.map((l) => l.left),
        ),
      })),
    );
  };

interface EvictReduceState<T> {
  now: number;
  toBeEvicted: Array<T>;
  toBeRetained: Array<state.Resource<T> | undefined>;
}
