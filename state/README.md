# Typesafe REST API Specification Extras - State Provider Callbacks With IO-TS

[![Coverage](https://codecov.io/gh/ty-ras/extras-io-ts/branch/main/graph/badge.svg?flag=state)](https://codecov.io/gh/ty-ras/extras-io-ts)

This folder contains `@ty-ras-extras/state-io-ts` library which exposes API with types and functions to create state validation callbacks which are most intuitive and easy to use with typical setups.
The state passed to endpoint handlers is modeled as object, and endpoint handler specify which properties they need from that object by providing an array of property names.
The state callback provided by this library will then produce `EndpointStateValidator` object of [@ty-ras/endpoint](https://github.com/ty-ras/server/tree/main/endpoint) library, which is then used by TyRAS server implementation to validate the state.
