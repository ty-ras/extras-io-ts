import test from "ava";
import * as spec from "../validation";
import * as t from "io-ts";

test("Validate that getFullStateValidationInfo works", (c) => {
  c.plan(1);
  c.deepEqual(
    spec.getFullStateValidationInfo(
      {
        userId: t.string,
      },
      {
        database: t.number,
      },
    ),
    {
      userId: {
        isAuthenticationProperty: true,
        validation: t.string,
      },
      database: {
        isAuthenticationProperty: false,
        validation: t.number,
      },
    },
  );
});
