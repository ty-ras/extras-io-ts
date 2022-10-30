import {
  function as F,
  array as A,
  readonlyArray as RA,
  either as E,
  task as T,
} from "fp-ts";
import * as api from "./api";
import * as pool from "./pool";

interface EvictReduceState<T> {
  now: number;
  toBeEvicted: Array<T>;
  toBeRetained: Array<pool.Resource<T> | undefined>;
}

export const createRunEviction =
  <TResource>(
    state: pool.ResourcePoolState<TResource>,
    destroy: pool.ResourceDestroyTask<TResource>,
  ): api.ResourcePoolAdministration<TResource>["runEviction"] =>
  (resourceIdleTime) => {
    const shouldEvict: api.ResourceIdleTimeCustomizationFunction<TResource> =
      typeof resourceIdleTime === "number"
        ? ({ returnedAt, now }) => now - returnedAt >= resourceIdleTime
        : resourceIdleTime;
    return F.pipe(
      state.resources,
      A.reduceWithIndex<
        pool.Resource<TResource> | undefined,
        EvictReduceState<TResource>
      >(
        { now: Date.now(), toBeEvicted: [], toBeRetained: [] },
        (idx, reduceState, r) => {
          if (
            idx >= state.minCount &&
            r &&
            r.returnedAt !== undefined &&
            shouldEvict({
              now: reduceState.now,
              returnedAt: r.returnedAt,
              resource: r.resource,
            })
          ) {
            reduceState.toBeEvicted.push(r.resource);
          } else {
            reduceState.toBeRetained.push(r);
          }
          return reduceState;
        },
      ),
      ({ toBeEvicted, toBeRetained }) => {
        state.resources = toBeRetained;
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
