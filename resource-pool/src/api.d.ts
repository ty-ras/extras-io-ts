import { task as T, taskEither as TE } from "fp-ts";

// TODO add setters to make it possible to tweak resource pool as time goes (e.g. based on some schedule)
export interface ResourcePoolAdministration<TResource> {
  getMaxCount: () => number | undefined;
  getMinCount: () => number;
  getCurrentResourceCount: () => number;
  runEviction: (
    resourceIdleTime: ResourceIdleTimeCustomization<TResource>,
  ) => T.Task<EvictionResult>;
}

export interface ResourcePool<TResource, TAcquireParameters = void> {
  acquire: ResourceAcquire<TResource, TAcquireParameters>;
  release: ResourceRelease<TResource>;
}

export type ResourceAcquire<TResource, TParameters> = (
  parameters: TParameters,
) => TE.TaskEither<Error, TResource>;
export type ResourceRelease<TResource> = (
  resource: TResource,
) => TE.TaskEither<Error, void>;

export type ResourceIdleTimeCustomization<T> =
  | number // Milliseconds
  | ResourceIdleTimeCustomizationFunction<T>;

export type ResourceIdleTimeCustomizationFunction<T> = (
  input: ResourceIdleTimeCustomizationFunctionInput<T>,
) => boolean; // This can not be async(`T.Task<boolean>`), as the resource might be borrowed meanwhile

export interface ResourceIdleTimeCustomizationFunctionInput<T> {
  returnedAt: number;
  now: number;
  resource: T;
}

export interface EvictionResult {
  resourcesDeleted: number;
  errors: ReadonlyArray<Error>;
}
