/* eslint-disable sonarjs/no-duplicate-string */
import test, { type ExecutionContext } from "ava";
import * as spec from "../state-validator-factory";
import * as t from "io-ts";
import * as stateSpec from "../spec";
import type * as tyras from "@ty-ras/data-backend";
import type * as tyrasCommon from "@ty-ras/data";

const validateOneStateSpec = <
  TStateSpec extends stateSpec.StateSpec<
    spec.GetStateValidationInfo<typeof factory>
  >,
>(
  c: ExecutionContext,
  stateSpec: TStateSpec,
  validatorInput: unknown,
  expectedValidatorOutput:
    | true
    | Pick<tyrasCommon.DataValidatorResultError, "error">
    | tyras.HTTPProtocolError,
) => {
  c.plan(2);
  const { stateInfo, validator } = factory(stateSpec);
  c.deepEqual(stateInfo, Object.keys(stateSpec), "State info must be expected");
  const validatorOutput = validator(validatorInput);
  const msg = "Validation callback should return expected object";
  // If expected output is error, we must use .like - since we can't properly match getHumanReadableMessage or errorInfo
  if (
    typeof expectedValidatorOutput === "object" &&
    expectedValidatorOutput.error === "error"
  ) {
    c.like(validatorOutput, expectedValidatorOutput, msg);
  } else {
    c.deepEqual(
      validatorOutput,
      expectedValidatorOutput === true
        ? { error: "none", data: validatorInput }
        : expectedValidatorOutput,
      msg,
    );
  }
};

const factory = spec.createStateValidatorFactory({
  userId: {
    isAuthenticationProperty: true,
    validation: t.string,
  },
  database: {
    isAuthenticationProperty: false,
    validation: t.number,
  },
});

test(
  "Validate that factory works for empty input",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {},
  // Input for state validator callback
  {},
  // State validator callback should succeed for the input
  true,
);

test(
  "Validate that factory works for full state with correct input",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {
    userId: true,
    database: true,
  },
  // Input for state validator callback
  {
    userId: "userId",
    database: 123,
  },
  // State validator callback should succeed for the input
  true,
);

test(
  "Validate that factory works for full state with incorrect input for authenticated property",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {
    userId: true,
    database: true,
  },
  // Input for state validator callback
  {},
  // State validator callback should detect that property related to authentication was missing from input
  { error: "protocol-error", statusCode: 401, body: undefined },
);

test(
  "Validate that factory works for full state with incorrect input for non-authenticated property",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {
    userId: true,
    database: true,
  },
  // Input for state validator callback
  { userId: "userId" },
  // State validator callback should detect that property NOT related to authentication was missing from input
  { error: "error" },
);

test(
  "Validate that factory detects optional properties",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {
    userId: false,
  },
  // Input for state validator callback
  {},
  true,
);

test(
  "Validate that factory works for exact match with correct input",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {
    userId: {
      match: stateSpec.MATCH_EXACT,
      value: "the-user-id",
    },
  },
  // Input for state validator callback
  {
    userId: "the-user-id",
  },
  true,
);

test(
  "Validate that factory works for exact match with incorrect input",
  validateOneStateSpec,
  // State specification (which properties are desired from full state)
  {
    database: {
      match: stateSpec.MATCH_EXACT,
      value: 42,
    },
  },
  // Input for state validator callback
  {
    database: 43,
  },
  { error: "error" },
);

test("Validate that factory detects invalid input", (c) => {
  c.plan(2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c.throws(() => factory({ notPresent: true } as any), {
    message: 'State does not contain "notPresent".',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c.throws(() => factory({ notPresent: false } as any), {
    message: 'State does not contain "notPresent".',
  });
});

test("Validate that factory works for oneOf matcher", (c) => {
  c.plan(2);
  const { validator } = factory({
    database: { match: stateSpec.MATCH_ONE_OF, values: [1, 2] },
  });
  const successfulInput = { database: 1 };
  c.deepEqual(validator(successfulInput), {
    error: "none",
    data: successfulInput,
  });
  c.like(validator({ database: 3 }), { error: "error" });
});

test("Validate that factory works for allOf matcher", (c) => {
  c.plan(2);
  const manyFactory = spec.createStateValidatorFactory({
    many: { isAuthenticationProperty: false, validation: t.array(t.string) },
  });
  const { validator } = manyFactory({
    many: { match: stateSpec.MATCH_ALL_OF, values: ["one", "two"] },
  });
  const successfulInput = { many: ["one", "two", "three"] };
  c.deepEqual(validator(successfulInput), {
    error: "none",
    data: successfulInput,
  });
  c.like(validator({ many: ["one"] }), { error: "error" });
});
