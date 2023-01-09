import test from "ava";
import * as t from "io-ts";
import * as spec from "../string";

test("Validate that validateFromStringifiedJSON works correctly", (c) => {
  c.plan(2);
  const willAlwaysFail = spec.validateFromStringifiedJSON(t.void);
  c.deepEqual(willAlwaysFail("{}"), {
    _tag: "Left",
    left: [
      {
        context: [
          {
            key: "",
            actual: {},
            type: t.void,
          },
        ],
        value: {},
        message: undefined,
      },
    ],
  });
  const realistic = spec.validateFromStringifiedJSON(
    t.type({ property: t.string }),
  );
  c.deepEqual(realistic('{"property": "hello"}'), {
    _tag: "Right",
    right: {
      property: "hello",
    },
  });
});

test("Validate that validateFromStringifiedJSONOrThrow works correctly", (c) => {
  c.plan(1);
  c.throws(() => spec.validateFromStringifiedJSONOrThrow(t.string)("null"), {
    instanceOf: Error,
  });
});

test("Validate that readJSONStringToValueOrThrow works correctly", (c) => {
  c.plan(5);
  const validator = spec.validateFromMaybeStringifiedJSONOrThrow(t.string);
  // When not non-empty string, error gets returned
  c.throws(() => validator(12), { instanceOf: Error });
  c.throws(() => validator(""), { instanceOf: Error });
  // If string but not parseable to JSON, the JSON.parse will throw
  c.throws(() => validator("  "), { instanceOf: Error });
  // When JSON string but doesn't pass validation, IO-TS error is thrown
  c.throws(() => validator("123"), { instanceOf: Error });
  // Otherwise, is success
  c.deepEqual(validator('"hello"'), "hello");
});

test("Validate that validateFromStringifiedJSON detects undefined value", (c) => {
  c.plan(1);
  c.deepEqual(spec.validateFromStringifiedJSON(t.string)(undefined), {
    _tag: "Left",
    left: new Error("Given string must not be undefined or empty."),
  });
});
