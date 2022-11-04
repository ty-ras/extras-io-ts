# Typesafe REST API Specification - IO-TS Based Typed SQL Query Execution

[![Coverage](https://codecov.io/gh/ty-ras/io-ts/branch/main/graph/badge.svg?flag=typed-sql)](https://codecov.io/gh/ty-ras/io-ts)

This folder contains `@ty-ras/typed-sql-io-ts` library which exposes API to create callbacks which will execute SQL queries against a parametrizable client.
These callbacks will expose the input signature at compile-time utilizing custom template functions, as well as compile-time types for query result.
In addition to that, the callbacks will perform runtime validation using [`io-ts`](https://github.com/gcanti/io-ts) library on inputs to the query, as well as output of the query execution rows returned by client.

The callbacks are built in such way that they are easy to use with [`fp-ts`](https://github.com/gcanti/fp-ts) `pipe` and `flow`:

![Animation of Usage of the Library](https://raw.githubusercontent.com/ty-ras/io-ts/main/typed-sql/doc/usage-demo.gif)

In the demo above, the final SQL query that would be sent to PostgreSQL server, would have been parameterized query `SELECT payload FROM things WHERE id = $1`, and the `id` parameter visible as second argument after `client` would be passed as a parameter.
Thus, even though it looks like the parameters are embedded in query and are a risk for SQL injection, they are not embedded in the query, and instead are sent separately, and there is no risk for SQL injection.

Furthermore, the call to `sql.executeQuery` captures all the names and types of input parameters, thus allowing intellisense to auto-complete the query parameters.
The returned rows of the query are then validated to contain only one row using `sql.validateRows` and `sql.one` invocation, again extracting the compile-time return type of the query for intellisense and other benefits.
All the input parameters and query output rows are also validated to adher to their corresponding types at **runtime** using `io-ts` library, seen in the demo as import alias `t`.
