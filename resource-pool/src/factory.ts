/**
 * @file This file contains code to create new {@link ResourcePoolWithAdministration}.
 */

import { either as E, taskEither as TE } from "fp-ts";
import type * as api from "./api.types";
import * as pool from "./pool";
import * as admin from "./administration";
import * as retry from "./retry";
import type * as state from "./state";

/**
 * Creates new instance of {@link ResourcePoolWithAdministration}, with creation and destroy callbacks utilizing {@link Promise} instead of {@link TE.TaskEither}.
 * If the given options have value for {@link ResourcePoolCreationOptions#maxCount} but not for {@link ResourcePoolCreationOptions#retry}, the {@link api.ResourcePool} of the return value will behave such that it will immediately return an error if max capacity is reached, __without retrying__.
 * @param param0 The {@link ResourcePoolCreationOptions}.
 * @param param0.create Privately deconstructed variable.
 * @param param0.destroy Privately deconstructed variable.
 * @returns The {@link ResourcePoolWithAdministration}.
 * @throws The {@link Error} if {@link ResourcePoolCreationOptions#maxCount} was less than {@link ResourcePoolCreationOptions#minCount}.
 */
export const createSimpleResourcePool = <T>({
  create,
  destroy,
  ...opts
}: ResourcePoolCreationOptions<T, ResourceCreate<T>, ResourceDestroy<T>>) =>
  createSimpleResourcePoolFromTasks({
    ...opts,
    create: () => TE.tryCatch(async () => await create(), E.toError),
    destroy: (resource: T) =>
      TE.tryCatch(async () => await destroy(resource), E.toError),
  });

/**
 * Creates new instance of {@link ResourcePoolWithAdministration}, with creation and destroy callbacks utilizing {@link TE.TaskEither} instead of {@link Promise}.
 * If the given options have value for {@link ResourcePoolCreationOptions#maxCount} but not for {@link ResourcePoolCreationOptions#retry}, the {@link api.ResourcePool} of the return value will behave such that it will immediately return an error if max capacity is reached, __without retrying__.
 * @param opts The {@link ResourcePoolCreationOptions}.
 * @returns The {@link ResourcePoolWithAdministration}.
 * @throws The {@link Error} if {@link ResourcePoolCreationOptions#maxCount} was less than {@link ResourcePoolCreationOptions#minCount}.
 */
export const createSimpleResourcePoolFromTasks = <T>(
  opts: ResourcePoolCreationOptions<
    T,
    api.ResourceCreateTask<T>,
    api.ResourceDestroyTask<T>
  >,
) => _createResourcePool(Object.assign({}, defaultOptions, opts));

/**
 * This interface specifies input for {@link createSimpleResourcePool} and {@link createSimpleResourcePoolFromTasks} functions.
 */
export interface ResourcePoolCreationOptions<T, TCreate, TDestroy> {
  /**
   * The minimum count of the resources.
   * If not specified, will be `0`.
   * Notice that the pool will not fill up the resources to this number during creation, instead this configuration only affects behaviour of {@link api.ResourcePoolAdministration#runEviction}
   */
  minCount?: number;

  /**
   * The optional maximum count of the resources.
   * If omitted, then resource pool __will have no limits__.
   */
  maxCount?: number;

  /**
   * The callback to initialize a new resource.
   */
  create: TCreate;

  /**
   * The callback to destroy given resource.
   */
  destroy: TDestroy;

  /**
   * The optional custom callback to check for resource equality, if using `===` is not sufficient.
   */
  equality?: api.Equality<T>;

  /**
   * The optional {@link retry.RetryFunctionality} to use.
   */
  retry?: retry.RetryFunctionality;
}

/**
 * The callback for creating the resource using {@link Promise}.
 */
export type ResourceCreate<T> = () => Promise<T>;

/**
 * The callback for destroying the resource using {@link Promise}.
 */
export type ResourceDestroy<T> = (resource: T) => Promise<void>;

/**
 * This is what is returned by {@link createSimpleResourcePool} and {@link createSimpleResourcePoolFromTasks} functions.
 * The {@link api.ResourcePool} and {@link api.ResourcePoolAdministration} can be freely deconstructed and used separately.
 * They are not castable to each other, thus allowing e.g. safe passage of {@link api.ResourcePool} to client code without worrying that it could do something administrative by sneakily casting it to {@link api.ResourcePoolAdministration}.
 */
export interface ResourcePoolWithAdministration<T, TAcquireParameters> {
  /**
   * The {@link api.ResourcePool} that can be used to acquire and destroy resources.
   * Is different object and not castable to {@link administration}.
   */
  pool: api.ResourcePool<T, TAcquireParameters>;

  /**
   * The {@link api.ResourcePoolAdministration} that be used to e.g. periodically invoke {@link api.ResourcePoolAdministration#runEviction} to clean up idle resources.
   * Is different object and not castable to {@link ResourcePoolWithAdministration#pool}.
   */
  administration: api.ResourcePoolAdministration<T>;
}

const _createResourcePool = <TResource>({
  minCount,
  maxCount,
  create,
  destroy,
  equality,
  retry: retryOpts,
}: InternalResourcePoolOptions<TResource>): ResourcePoolWithAdministration<
  TResource,
  void
> => {
  if (maxCount !== undefined && maxCount < minCount) {
    throw new Error(
      `The given maximum count ${maxCount} was less than given min count ${minCount}.`,
    );
  }
  const state: state.ResourcePoolState<TResource> = {
    resources: [],
    minCount,
    maxCount,
    equality,
  };

  const poolRetVal: api.ResourcePool<TResource> = {
    acquire: pool.createAcquire(state, create),
    release: pool.createRelease(state),
  };

  return {
    pool: retryOpts
      ? retry.augmentWithRetry(retryOpts)(poolRetVal)
      : poolRetVal,
    administration: {
      getCurrentResourceCount: () =>
        pool.getCurrentResourceCount(state.resources),
      getMinCount: () => state.minCount,
      getMaxCount: () => state.maxCount,
      runEviction: admin.createRunEviction(state, destroy),
    },
  };
};

const defaultOptions = {
  minCount: 0,
  equality: (x, y) => x === y,
} as const satisfies Omit<
  ResourcePoolCreationOptions<unknown, never, never>,
  "create" | "destroy"
>;

type InternalResourcePoolOptions<T> = typeof defaultOptions &
  ResourcePoolCreationOptions<
    T,
    api.ResourceCreateTask<T>,
    api.ResourceDestroyTask<T>
  >;
