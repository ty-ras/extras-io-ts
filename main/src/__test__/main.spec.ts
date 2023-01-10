import test from "ava";
import * as spec from "../main";
import { taskEither as TE } from "fp-ts";

test("Validate that normal main invocation works", async (c) => {
  c.plan(1);
  const info = await spec.invokeMainAndGetInfo(mainSuccess);
  c.deepEqual(info, { callProcessExit: true, exitCode: 0 });
});

test("Validate that erroneus main invocation works", async (c) => {
  c.plan(1);
  const info = await spec.invokeMainAndGetInfo(mainError);
  c.deepEqual(info, { callProcessExit: true, exitCode: 1 });
});

test("Validate that normal main invocation with skipping process.exit call works", async (c) => {
  c.plan(1);
  const info = await spec.invokeMainAndGetInfo(mainSuccess, false);
  c.deepEqual(info, { callProcessExit: false, exitCode: 0 });
});

test("Validate that erroneus main invocation with skipping process.exit call works", async (c) => {
  c.plan(1);
  const info = await spec.invokeMainAndGetInfo(mainError, false);
  // Notice that in case of errors, we always call process.exit
  c.deepEqual(info, { callProcessExit: true, exitCode: 1 });
});

const mainSuccess = () => TE.right("success");
const mainError = () => TE.left("error");
