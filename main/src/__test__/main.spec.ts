import test from "ava";
import * as spec from "../main";
import { function as F, taskEither as TE } from "fp-ts";
import * as exit from "./exit";

test.before(() => {
  // Copy main.ts to main.ts.original
  // Replace string in main.ts:
  // 'process.exit(' => '(await import("./__test__/exit")).exit('
});
test.beforeEach(() => {
  exit.exitCodes.length = 0;
});

test.after.always(() => {
  // Copy main.ts.original to main.ts
  console.log("AFTER executed");
});

test("Validate that normal main invocation works", async (c) => {
  c.plan(1);
  await spec.invokeMain(() => TE.of("ignored"));
  c.deepEqual(exit.exitCodes, [0]);
});
