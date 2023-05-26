/**
 * @file This file is to avoid circular dependency factory.ts -> state.ts -> factory.ts -> ..., since we want to ex
 */

import type { eq as EQ } from "fp-ts";

/**
 * This is callback type to check for equality of two resources.
 */
export type Equality<T> = EQ.Eq<T>["equals"];
