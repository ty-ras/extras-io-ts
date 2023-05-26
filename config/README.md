# Typesafe REST API Specification Extras - Configuration Utilities with FP-TS

[![Coverage](https://codecov.io/gh/ty-ras/extras-io-ts/branch/main/graph/badge.svg?flag=config)](https://codecov.io/gh/ty-ras/extras-io-ts)

This folder contains library which exposes few utility functions which can be used by both backend and frontend applications to read configurations from strings (e.g. environment variables).
The strings are parsed as necessary and then validated at runtime using [`io-ts`](https://github.com/gcanti/fp-ts) library.

# Using in Frontend

```ts
import { function as F } from "fp-ts";
import * as t from "io-ts";
import { configuration } from "@ty-ras-extras/frontend-io-ts";
// Or, if not using bundled libraries: import * as configuration from "@ty-ras-extras/config-io-ts/string";

// Define runtime validation of configuration
const validation = t.type({
  someStringProperty: t.string,
});
// Acquire configuration
export const config = F.pipe(
  import.meta.env["MY_FE_CONFIG"], // Or, if webpack: process.env["MY_FE_CONFIG"],
  configuration.validateFromStringifiedJSONOrThrow(validation),
);
// The compile-time type of 'config' is now:
// {
//   someStringProperty: string
// }
```

# Using in Backend
For situations where environment variable is always serialized JSON:
```ts
import { function as F } from "fp-ts";
import * as t from "io-ts";
import { configuration } from "@ty-ras-extras/backend-io-ts";
// Or, if not using bundled libraries: import * as configuration from "@ty-ras-extras/config-io-ts/string";

// Define runtime validation of configuration
const validation = t.type({
  someStringProperty: t.string,
});
// Acquire configuration
export const config = F.pipe(
  process.env["MY_BE_CONFIG"],
  configuration.validateFromStringifiedJSONOrThrow(validation),
);
// The compile-time type of 'config' is now:
// {
//   someStringProperty: string
// }
```

For situations where environment variable is either serialized JSON or a path to file containing serialized JSON:
```ts
import { function as F } from "fp-ts";
import * as t from "io-ts";
import { configuration } from "@ty-ras-extras/backend-io-ts";
// Or, if not using bundled libraries: import * as configuration from "@ty-ras-extras/config-io-ts/maybe-file";

// Define runtime validation of configuration
const validation = t.type({
  someStringProperty: t.string,
});
// Acquire configuration
export const acquireConfiguration = async () => await F.pipe(
  process.env["MY_BE_CONFIG"],
  configuration.getJSONStringValueFromStringWhichIsJSONOrFilename(validation),
  configuration.validateFromStringifiedJSONOrThrow(validation)
);
// The compile-time type of 'acquireConfiguration' is now:
// () => Promise<{
//   someStringProperty: string
// }>
```
