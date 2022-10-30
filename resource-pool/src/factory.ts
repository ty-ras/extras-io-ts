import { either as E, taskEither as TE } from "fp-ts";
import * as api from "./api";
import * as pool from "./pool";
import * as admin from "./administration";

// "Throws" if max count constraint is violated
// Can build another pool on top of this, which would instead keep retrying until succeeding.
export const createSimpleResourcePool = <T>({
  create,
  destroy,
  ...opts
}: ResourcePoolCreationOptions<ResourceCreate<T>, ResourceDestroy<T>>) =>
  createSimpleResourcePoolFromTasks({
    ...opts,
    create: () => TE.tryCatch(async () => await create(), E.toError),
    destroy: (resource: T) =>
      TE.tryCatch(async () => await destroy(resource), E.toError),
  });

export const createSimpleResourcePoolFromTasks = <T>(
  opts: ResourcePoolCreationOptions<
    pool.ResourceCreateTask<T>,
    pool.ResourceDestroyTask<T>
  >,
) => _createResourcePool(Object.assign({}, defaultOptions, opts));

export interface ResourcePoolCreationOptions<TCreate, TDestroy> {
  minCount?: number; // Default 0
  maxCount?: number; // TODO check that >= minCount
  create: TCreate;
  destroy: TDestroy;
}

export type ResourceCreate<T> = () => Promise<T>;
export type ResourceDestroy<T> = (resource: T) => Promise<void>;

export interface ResourcePoolWithAdministration<T, TAcquireParameters> {
  pool: api.ResourcePool<T, TAcquireParameters>;
  administration: api.ResourcePoolAdministration<T>;
}

const _createResourcePool = <TResource>({
  minCount,
  maxCount,
  create,
  destroy,
}: InternalResourcePoolOptions<TResource>): ResourcePoolWithAdministration<
  TResource,
  void
> => {
  const state: pool.ResourcePoolState<TResource> = {
    resources: [],
    minCount,
    maxCount,
  };

  return {
    pool: {
      acquire: pool.createAcquire(state, create),
      release: pool.createRelease(state),
    },
    administration: {
      getCurrentResourceCount: () => state.resources.length,
      getMinCount: () => state.minCount,
      getMaxCount: () => state.maxCount,
      runEviction: admin.createRunEviction(state, destroy),
    },
  };
};

const defaultOptions = {
  minCount: 0,
  evictionCheckRunInterval: 1000,
};

type InternalResourcePoolOptions<T> = typeof defaultOptions &
  ResourcePoolCreationOptions<
    pool.ResourceCreateTask<T>,
    pool.ResourceDestroyTask<T>
  >;
