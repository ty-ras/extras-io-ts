import test from "ava";
import * as spec from "../spec";

test("Validate that spec constants are expected", (c) => {
  // This is a bit dummy test, but I don't want to use C8 ignore line coverage comments either
  c.plan(3);
  c.deepEqual(spec.MATCH_EXACT, "exact");
  c.deepEqual(spec.MATCH_ONE_OF, "oneOf");
  c.deepEqual(spec.MATCH_ALL_OF, "allOf");
});
