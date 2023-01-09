import test, { ExecutionContext } from "ava";
import { either as E } from "fp-ts";
import * as fs from "fs/promises";
import * as spec from "../maybe-file";

const testPassThru = async (c: ExecutionContext, value: string) => {
  c.plan(1);
  c.deepEqual(
    await spec.getJSONStringValueFromStringWhichIsJSONOrFilename(value)(),
    E.right(value),
  );
};

test("Validate that passThru works for 'null'", testPassThru, "null");
test("Validate that passThru works for '0'", testPassThru, "0");
test("Validate that passThru works for '1'", testPassThru, "1");
test("Validate that passThru works for '-1'", testPassThru, "-1");
test("Validate that passThru works for 'true'", testPassThru, "true");
test("Validate that passThru works for 'false'", testPassThru, "false");
test("Validate that passThru works for '\"hello\"'", testPassThru, '"hello"');
test("Validate that passThru works for '[]'", testPassThru, "[]");
test("Validate that passThru works for '{}'", testPassThru, "{}");

const testFile = async (c: ExecutionContext, path: string) => {
  c.plan(1);
  c.deepEqual(
    await spec.getJSONStringValueFromStringWhichIsJSONOrFilename(path)(),
    E.right(await fs.readFile(path, "utf-8")),
  );
};

test(
  "Validate that file works for './package.json'",
  testFile,
  "./package.json",
);

test("Validate that getJSONStringValueFromStringWhichIsJSONOrFilename detects incorrect input", async (c) => {
  c.plan(1);
  c.deepEqual(
    await spec.getJSONStringValueFromStringWhichIsJSONOrFilename("garbage")(),
    E.left(
      new Error(
        'The env variable string must start with one of the following: "^\\W*(\\{|\\[|"|t|f|\\d|-|n)",".","/".',
      ),
    ),
  );
});
