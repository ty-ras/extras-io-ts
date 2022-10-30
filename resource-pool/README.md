# Typesafe REST API Specification - FP-TS Based Resource Pool

[![Coverage](https://codecov.io/gh/ty-ras/io-ts/branch/main/graph/badge.svg?flag=resource-pool)](https://codecov.io/gh/ty-ras/io-ts)

This folder contains library which exposes function to create `ResourcePool`s which are operating based on `Task`s and `TaskEither`s of [`fp-ts`](https://github.com/gcanti/fp-ts) library.
The function returns separate `ResourcePoolAdministration` object, which can be used to run eviction cycle and request pool parameters.
In the future, the `ResourcePoolAdministration` will be expanded to also modify the pool parameters at runtime, enabling varying resource pool configration based on e.g. certain schedule.
