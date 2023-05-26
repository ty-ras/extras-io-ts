/**
 * @file This file contains unit tests for functionality in file `../input.ts`.
 */

/* eslint-disable sonarjs/no-duplicate-string, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import test from "ava";
import * as spec from "../input";
import * as parameters from "../parameters";
import * as errors from "../errors";
import { function as F, either as E } from "fp-ts";
import * as t from "io-ts";
import * as common from "./common";

test("Validate that execution works for parameterless SQL", async (c) => {
  c.plan(5);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const executor = F.pipe(usingMockedClient, spec.prepareSQL`SELECT 1`);
  const expectedSQLString = "SELECT 1";
  c.deepEqual(executor.sqlString, expectedSQLString);
  c.deepEqual(seenParameters, []);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor()(loggedQueries)();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: expectedSQLString,
        parameters: [],
      },
    ]);
    c.deepEqual(seenParameters, []);
  }
});

test("Validate that execution works for SQL with raw SQL string fragments", async (c) => {
  c.plan(5);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const executor = F.pipe(
    usingMockedClient,
    spec.prepareSQL`SELECT ${parameters.raw("1")}`,
  );
  const expectedSQLString = "SELECT 1";
  c.deepEqual(executor.sqlString, expectedSQLString);
  c.deepEqual(seenParameters, []);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor()(loggedQueries)();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: "SELECT 1",
        parameters: [],
      },
    ]);
    c.deepEqual(seenParameters, []);
  }
});

test("Validate that execution works for SQL with parameters", async (c) => {
  c.plan(5);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const idParameter = parameters.param("id", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.prepareSQL`SELECT payload FROM things WHERE id = ${idParameter}`,
  );

  const expectedSQLString = "SELECT payload FROM things WHERE id = $1";
  c.deepEqual(executor.sqlString, expectedSQLString);
  const expectedSeenParameters = [
    {
      parameter: idParameter,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor({ id: "id" })(loggedQueries)();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: expectedSQLString,
        parameters: ["id"],
      },
    ]);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});

test("Validate that execution works for SQL with raw fragments and parameters mixed", async (c) => {
  c.plan(5);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const idParameter = parameters.param("id", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.prepareSQL`SELECT ${parameters.raw(
      "payload",
    )} FROM things WHERE id = ${idParameter}`,
  );
  const expectedSQLString = "SELECT payload FROM things WHERE id = $1";
  c.deepEqual(executor.sqlString, expectedSQLString);
  const expectedSeenParameters = [
    {
      parameter: idParameter,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor({ id: "id" })(loggedQueries)();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: expectedSQLString,
        parameters: ["id"],
      },
    ]);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});

test("Validate that passing invalid parameters to prepareSQL throws correct errors", (c) => {
  c.plan(2);
  c.throws(
    () =>
      spec.prepareSQL`SELECT ${parameters.param(
        "duplicate",
        t.string,
      )}, ${parameters.param("duplicate", t.number)}`,
    {
      instanceOf: errors.DuplicateSQLParameterNameError,
    },
  );
  c.throws(() => spec.prepareSQL`SELECT ${"garbage" as any}`, {
    instanceOf: errors.InvalidSQLTemplateArgumentError,
  });
});

test("Validate that invalid query input parameters are detected", async (c) => {
  c.plan(5);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const idParameter = parameters.param("id", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.prepareSQL`SELECT payload FROM things WHERE id = ${idParameter}`,
  );
  c.deepEqual(executor.sqlString, "SELECT payload FROM things WHERE id = $1");
  const expectedSeenParameters = [
    {
      parameter: idParameter,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor("garbage" as any)(loggedQueries)();
  if (E.isLeft(result)) {
    c.true(result.left instanceof errors.SQLQueryInputValidationError);
    c.deepEqual(loggedQueries, []);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});

test("Validate that duplicate parameters work ", async (c) => {
  c.plan(5);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const sameParameterReferencedTwice = parameters.param("param", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.prepareSQL`SELECT value FROM table WHERE one_property = ${sameParameterReferencedTwice} OR another_property = ${sameParameterReferencedTwice}`,
  );
  const expectedSQLString =
    "SELECT value FROM table WHERE one_property = $1 OR another_property = $1";
  c.deepEqual(executor.sqlString, expectedSQLString);
  const expectedSeenParameters = [
    {
      parameter: sameParameterReferencedTwice,
      index: 0,
    },
    {
      parameter: sameParameterReferencedTwice,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor({
    param: "something",
  })(loggedQueries)();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: expectedSQLString,
        parameters: ["something"],
      },
    ]);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});
