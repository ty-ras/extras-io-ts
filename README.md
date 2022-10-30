# Typesafe REST API Specification - IO-TS Generic Libraries

[![CI Pipeline](https://github.com/ty-ras/io-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/ty-ras/io-ts/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/ty-ras/io-ts/actions/workflows/cd.yml/badge.svg)](https://github.com/ty-ras/io-ts/actions/workflows/cd.yml)

The Typesafe REST API Specification is a family of libraries used to enable seamless development of Backend and/or Frontend which communicate via HTTP protocol.
The protocol specification is checked both at compile-time and run-time to verify that communication indeed adhers to the protocol.
This all is done in such way that it does not make development tedious or boring, but instead robust and fun!

This particular repository contains generic libraries related to using [IO-TS](https://github.com/gcanti/io-ts) and [FP-TS](https://github.com/gcanti/fp-ts):
- [resource-pool](./resource-pool) contains generic resource pool API and implementation which uses `Task`s and `TaskEither` constructs of `fp-ts`.
