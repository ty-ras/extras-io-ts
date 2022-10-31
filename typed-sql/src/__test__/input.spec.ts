/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "ava";
import * as spec from "../input";
import * as parameters from "../parameters";
import * as errors from "../errors";
import { function as F, either as E } from "fp-ts";
import * as t from "io-ts";
import * as common from "./common";

test("Validate that execution works for parameterless SQL", async (c) => {
  c.plan(4);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const executor = F.pipe(usingMockedClient, spec.executeSQLQuery`SELECT 1`);
  c.deepEqual(seenParameters, []);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor(loggedQueries)();
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

test("Validate that execution works for SQL with raw SQL string fragments", async (c) => {
  c.plan(4);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const executor = F.pipe(
    usingMockedClient,
    spec.executeSQLQuery`SELECT ${parameters.raw("1")}`,
  );
  c.deepEqual(seenParameters, []);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor(loggedQueries)();
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
  c.plan(4);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const idParameter = parameters.parameter("id", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.executeSQLQuery`SELECT payload FROM things WHERE id = ${idParameter}`,
  );
  const expectedSeenParameters = [
    {
      parameter: idParameter,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor(loggedQueries, { id: "id" })();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: "SELECT payload FROM things WHERE id = $1",
        parameters: ["id"],
      },
    ]);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});

test("Validate that execution works for SQL with raw fragments and parameters mixed", async (c) => {
  c.plan(4);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const idParameter = parameters.parameter("id", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.executeSQLQuery`SELECT ${parameters.raw(
      "payload",
    )} FROM things WHERE id = ${idParameter}`,
  );
  const expectedSeenParameters = [
    {
      parameter: idParameter,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor(loggedQueries, { id: "id" })();
  if (E.isRight(result)) {
    c.deepEqual(result.right, mockQueryResult);
    c.deepEqual(loggedQueries, [
      {
        query: "SELECT payload FROM things WHERE id = $1",
        parameters: ["id"],
      },
    ]);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});

test("Validate that passing invalid parameters to executeSQLQuery throws correct errors", (c) => {
  c.plan(2);
  c.throws(
    () =>
      spec.executeSQLQuery`SELECT ${parameters.parameter(
        "duplicate",
        t.string,
      )}, ${parameters.parameter("duplicate", t.string)}`,
    {
      instanceOf: errors.DuplicateSQLParameterNameError,
    },
  );
  c.throws(() => spec.executeSQLQuery`SELECT ${"garbage" as any}`, {
    instanceOf: errors.InvalidSQLTemplateArgumentError,
  });
});

test("Validate that invalid query input parameters are detected", async (c) => {
  c.plan(4);
  const mockQueryResult = ["returnedRow"];
  const { seenParameters, usingMockedClient } =
    common.createMockedClientProvider([mockQueryResult]);
  const idParameter = parameters.parameter("id", t.string);
  const executor = F.pipe(
    usingMockedClient,
    spec.executeSQLQuery`SELECT payload FROM things WHERE id = ${idParameter}`,
  );
  const expectedSeenParameters = [
    {
      parameter: idParameter,
      index: 0,
    },
  ];
  c.deepEqual(seenParameters, expectedSeenParameters);
  const loggedQueries: common.LoggedQueries = [];
  const result = await executor(loggedQueries, "garbage" as any)();
  if (E.isLeft(result)) {
    // We can't access the query validation, therefore we delete ref to it
    delete (result.left as any)[0].context[0]["type"];
    c.deepEqual(result.left, [
      {
        context: [{ actual: "garbage", key: "" }],
        message: undefined,
        value: "garbage",
      },
    ]);
    c.deepEqual(loggedQueries, []);
    c.deepEqual(seenParameters, expectedSeenParameters);
  }
});
