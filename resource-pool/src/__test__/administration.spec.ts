import test from "ava";
import * as spec from "../factory";
import type * as api from "../api";
import * as common from "./common";
import { either as E } from "fp-ts";

test("Validate that creating results in pool with initial state", async (c) => {
  c.plan(6);
  const creates: Array<common.Resource> = [];
  const destroys: Array<common.Resource> = [];
  const { administration } = spec.createSimpleResourcePool({
    create: common.recordCreates(creates, "Resource"),
    destroy: common.recordDestroys(destroys),
  });
  c.deepEqual(administration.getCurrentResourceCount(), 0);
  c.deepEqual(administration.getMinCount(), 0);
  c.deepEqual(administration.getMaxCount(), undefined);
  c.deepEqual(await administration.runEviction(0)(), common.noResourcesEvicted);
  c.deepEqual(creates, []);
  c.deepEqual(destroys, []);
});

test("Validate that basic eviction usage works", async (c) => {
  c.plan(8);
  const creates: Array<common.Resource> = [];
  const destroys: Array<common.Resource> = [];
  const { pool, administration } = spec.createSimpleResourcePool({
    create: common.recordCreates(creates, "Resource"),
    destroy: common.recordDestroys(destroys),
  });
  const resourceResult = await pool.acquire()();
  if (E.isRight(resourceResult)) {
    const resource = resourceResult.right;

    c.deepEqual(administration.getCurrentResourceCount(), 1);
    c.deepEqual(
      await administration.runEviction(0)(),
      common.noResourcesEvicted,
    );
    c.deepEqual(creates, [resource]);
    c.deepEqual(destroys, []);

    await pool.release(resource)();
    c.deepEqual(administration.getCurrentResourceCount(), 1);
    c.deepEqual(
      await administration.runEviction(0)(),
      common.successfulResourcesEviction(1),
    );
    c.deepEqual(creates, [resource]);
    c.deepEqual(destroys, [resource]);
  }
});

test("Validate that eviction logic callback works", async (c) => {
  c.plan(4);
  const creates: Array<common.Resource> = [];
  const destroys: Array<common.Resource> = [];
  const { pool, administration } = spec.createSimpleResourcePool({
    create: common.recordCreates(creates, "Resource"),
    destroy: common.recordDestroys(destroys),
  });
  const resourceResult = await pool.acquire()();
  if (E.isRight(resourceResult)) {
    await pool.release(resourceResult.right)();
    const inputs: Array<
      api.ResourceIdleTimeCustomizationFunctionInput<common.Resource>
    > = [];
    await administration.runEviction((info) => (inputs.push(info), false))();
    c.deepEqual(inputs.length, 1);
    c.true(inputs[0].returnedAt <= inputs[0].now);
    c.like(inputs[0], {
      resource: "Resource",
    });
    c.deepEqual(administration.getCurrentResourceCount(), 1);
  }
});

test("Validate that eviction survives destroy errors", async (c) => {
  c.plan(3);
  const { pool, administration } = spec.createSimpleResourcePool({
    create: () =>
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("Resource"), 100),
      ),
    destroy: () => {
      throw new DestroyError();
    },
  });
  const [first, second] = await Promise.all([0, 1].map(() => pool.acquire()()));
  if (E.isRight(first) && E.isRight(second)) {
    await Promise.all([first, second].map((r) => pool.release(r.right)()));
    const evictionResult = await administration.runEviction(0)();
    c.deepEqual(evictionResult.resourcesDeleted, 2);
    c.deepEqual(evictionResult.errors.length, 2);
    c.true(evictionResult.errors.every((e) => e instanceof DestroyError));
  }
});

class DestroyError extends Error {}
