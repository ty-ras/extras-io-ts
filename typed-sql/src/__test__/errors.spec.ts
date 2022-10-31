import test from "ava";
import * as spec from "../errors";

test("Validate that isDuplicateSQLParameterNameError method works", (c) => {
  c.plan(3);
  c.true(
    spec.isDuplicateSQLParameterNameError(
      new spec.DuplicateSQLParameterNameError("parameterName"),
    ),
  );
  c.false(
    spec.isDuplicateSQLParameterNameError(
      new spec.InvalidSQLTemplateArgumentError(0),
    ),
  );
  c.false(spec.isDuplicateSQLParameterNameError(new Error()));
});

test("Validate that isInvalidSQLTemplateArgumentError method works", (c) => {
  c.plan(3);
  c.true(
    spec.isInvalidSQLTemplateArgumentError(
      new spec.InvalidSQLTemplateArgumentError(0),
    ),
  );
  c.false(
    spec.isInvalidSQLTemplateArgumentError(
      new spec.DuplicateSQLParameterNameError("parameterName"),
    ),
  );
  c.false(spec.isInvalidSQLTemplateArgumentError(new Error()));
});
