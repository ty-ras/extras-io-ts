import {
  function as F,
  option as O,
  array as A,
  either as E,
  taskEither as TE,
  type eq as EQ,
} from "fp-ts";
import type * as api from "./api";
import * as errors from "./errors";

export const createAcquire =
  <TResource>(
    state: ResourcePoolState<TResource>,
    create: ResourceCreateTask<TResource>,
  ): api.ResourceAcquire<TResource, void> =>
  () =>
    F.pipe(
      state.resources,
      // Find first free resource (and map from "Resource<T> | undefined" to "Resource<T>")
      A.findFirstMap((r) =>
        r && r.returnedAt !== undefined ? O.some(r) : O.none,
      ),
      // If found, then mark as reserved
      O.chainFirst((r) => ((r.returnedAt = undefined), O.some("ignored"))),
      O.getOrElseW(() =>
        // If not found, then start process of creating new one
        F.pipe(
          state.resources.length,
          E.fromPredicate(
            (len) => isRoomForResource(state.maxCount, len),
            () =>
              new errors.ResourcePoolFullError(
                "Resource pool max capacity reached",
              ),
          ),
          // Before doing async, mark that we are reserved this array slot for future use
          E.chainFirst((idx) => E.of((state.resources[idx] = undefined))),
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
                state.resources.splice(err.idx, 1);
              }
              // Return Error object
              return isError ? err : err.error;
            },
            ({ idx, resource }) => {
              // We have succeeded -> save the result
              state.resources[idx] = new Resource(resource);
              // Return the resource
              return resource;
            },
          ),
        ),
      ),
      // Lift sync version to async
      (resourceOrTask) =>
        resourceOrTask instanceof Resource
          ? TE.of<Error, TResource>(resourceOrTask.resource)
          : resourceOrTask,
    );

export const createRelease =
  <TResource>(
    state: ResourcePoolState<TResource>,
  ): api.ResourceRelease<TResource> =>
  (resource) =>
    F.pipe(
      state.resources,
      // Find the resource from state
      A.findFirstMap((r) =>
        r && state.equality(r.resource, resource) && r.returnedAt === undefined
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

export interface ResourcePoolState<T> {
  resources: Array<Resource<T> | undefined>;
  minCount: number;
  maxCount: number | undefined;
  equality: Equality<T>;
}

export type ResourceCreateTask<T> = () => TE.TaskEither<Error, T>;
export type ResourceDestroyTask<T> = (
  resource: T,
) => TE.TaskEither<Error, void>;
export type Equality<T> = EQ.Eq<T>["equals"];

export class Resource<T> {
  public constructor(
    public readonly resource: T,
    public returnedAt: number | undefined = undefined, // undefined - currently in use. Otherwise timestamp in ms.
  ) {}
}

const isRoomForResource = (maxCount: number | undefined, arrayLength: number) =>
  maxCount === undefined || arrayLength < maxCount;
