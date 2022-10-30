import test from "ava";
import * as spec from "../errors";

test("Validate that ResourcePoolFullError is detected correctly", (c) => {
  c.plan(3);
  c.true(spec.isResourcePoolFullError(new spec.ResourcePoolFullError()));
  c.false(spec.isResourcePoolFullError(new spec.ResourceNotPartOfPoolError()));
  c.false(spec.isResourcePoolFullError(new Error()));
});

test("Validate that ResourceNotPartOfPoolError is detected correctly", (c) => {
  c.plan(3);
  c.true(
    spec.isResourceNotPartOfPoolError(new spec.ResourceNotPartOfPoolError()),
  );
  c.false(spec.isResourceNotPartOfPoolError(new spec.ResourcePoolFullError()));
  c.false(spec.isResourceNotPartOfPoolError(new Error()));
});
