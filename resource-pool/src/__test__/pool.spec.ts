import test from "ava";
import * as spec from "../factory";
import * as errors from "../errors";
import * as common from "./common";
import { either as E } from "fp-ts";

test("Validate that throwing exception in create callback is handled correctly", async (c) => {
  c.plan(3);
  const destroys: Array<common.Resource> = [];
  const { pool, administration } = spec.createSimpleResourcePool({
    create: () => {
      throw new CreationError();
    },
    destroy: common.recordDestroys(destroys),
  });
  const resourceResult = await pool.acquire()();
  if (E.isLeft(resourceResult)) {
    c.true(resourceResult.left instanceof CreationError);
    c.deepEqual(administration.getCurrentResourceCount(), 0);
    c.deepEqual(destroys, []);
  }
});

test("Validate that pool max limit is adhered to", async (c) => {
  c.plan(3);
  const creates: Array<common.Resource> = [];
  const destroys: Array<common.Resource> = [];
  const { pool, administration } = spec.createSimpleResourcePool({
    create: common.recordCreates(creates, "Resource"),
    destroy: common.recordDestroys(destroys),
    maxCount: 0,
  });
  const resourceResult = await pool.acquire()();
  if (E.isLeft(resourceResult)) {
    c.true(errors.isResourcePoolFullError(resourceResult.left));
    c.deepEqual(administration.getCurrentResourceCount(), 0);
    c.deepEqual(destroys, []);
  }
});

test("Validate that returning resource not part of the pool is detected", async (c) => {
  c.plan(4);
  const creates: Array<common.Resource> = [];
  const destroys: Array<common.Resource> = [];
  const { pool, administration } = spec.createSimpleResourcePool({
    create: common.recordCreates(creates, "Resource"),
    destroy: common.recordDestroys(destroys),
  });
  const resource = await pool.acquire()();
  c.true(E.isRight(resource));
  const maybeError = await pool.release("NotResource")();
  if (E.isLeft(maybeError)) {
    c.true(errors.isResourceNotPartOfPoolError(maybeError.left));
    c.deepEqual(administration.getCurrentResourceCount(), 1);
    c.deepEqual(destroys, []);
  }
});

test("Validate that already existing resource is returned on re-acquire", async (c) => {
  c.plan(2);
  let resCount = 0;
  const { pool } = spec.createSimpleResourcePool({
    create: () => Promise.resolve(resCount++),
    destroy: () => Promise.resolve(),
  });
  const resource = await pool.acquire()();
  if (E.isRight(resource)) {
    await pool.release(resource.right)();
    c.deepEqual(resCount, 1);
    const sameResource = await pool.acquire()();
    if (E.isRight(sameResource)) {
      c.deepEqual(resource.right, sameResource.right);
    }
  }
});

test("Validate that concurrent acquire works", async (c) => {
  c.plan(1);
  let resCount = 0;
  const { pool } = spec.createSimpleResourcePool({
    create: () =>
      new Promise<number>((resolve) =>
        setTimeout(() => resolve(resCount++), 500),
      ),
    destroy: () => Promise.resolve(),
  });
  const [first, second] = await Promise.all([0, 1].map(() => pool.acquire()()));
  if (E.isRight(first) && E.isRight(second)) {
    c.deepEqual([first.right, second.right], [0, 1]);
  }
});

test("Validate that if one creation callback throws while another is being awaited on, the pool state retains integrity", async (c) => {
  c.plan(5);
  let invocationCount = 0;
  const { pool } = spec.createSimpleResourcePool({
    create: () => {
      ++invocationCount;
      const thisCount = invocationCount;
      return invocationCount > 2
        ? Promise.reject(
            "This is test error: pool did not preserve state integrity while awaiting on two creation callbacks while one of them throwed",
          )
        : new Promise<number>((resolve, reject) =>
            setTimeout(
              () =>
                thisCount === 1
                  ? reject("Rejecting first creation")
                  : resolve(thisCount),
              thisCount === 1 ? 200 : 500,
            ),
          );
    },
    destroy: () => Promise.resolve(),
  });
  const firstResource = pool.acquire()();
  await new Promise<void>((resolve) => setTimeout(resolve, 100));
  const secondResource = pool.acquire()();
  c.deepEqual(
    await firstResource,
    E.left(new Error("Rejecting first creation")),
  );
  c.deepEqual(await secondResource, E.right(2));
  c.deepEqual(await pool.release(2)(), E.right(undefined));
  c.deepEqual(await pool.acquire()(), E.right(2));
  c.deepEqual(invocationCount, 2);
});

class CreationError extends Error {
  public constructor() {
    super("Creation error");
  }
}
