import test from "node:test";
import assert from "node:assert/strict";
import {
  blankApplication,
  persistState,
  readState,
  sanitizeApplication,
  STORAGE_KEY,
  validateApplication,
} from "../src/model.js";
const valid = () => ({
  ...blankApplication(),
  audience: "父母或家人",
  device: "其他 CPE 设备",
  deviceModel: "C2000 Pro",
  usage: "50GB 以内",
  plans: ["家庭共享"],
  feesAccepted: true,
});

test("prior vanilla submissions remain compatible and consent stays optional", () => {
  const application = valid();
  const state = readState({
    getItem: (key) =>
      key === STORAGE_KEY
        ? JSON.stringify({
            signedIn: true,
            introSeen: true,
            application,
            draft: application,
          })
        : null,
  });
  assert.equal(state.signedIn, true);
  assert.deepEqual(state.application, application);
  assert.deepEqual(validateApplication(application), {});
  assert.equal(state.application.consent, false);
});
test("cache corruption and incomplete submitted records never become successful registrations", () => {
  assert.equal(readState({ getItem: () => "{broken" }).application, null);
  assert.equal(
    readState({
      getItem: () => JSON.stringify({ application: {}, signedIn: true }),
    }).application,
    null,
  );
  assert.deepEqual(
    readState({
      getItem: () => {
        throw new Error("blocked");
      },
    }).draft,
    blankApplication(),
  );
});
test("sanitization bounds stored values, removes duplicate plans and obsolete device models", () => {
  const a = sanitizeApplication({
    ...valid(),
    device: "Ultra，已经收到",
    story: "字".repeat(130),
    plans: ["家庭共享", "家庭共享", "备用网络", "双网络聚合"],
    consent: "true",
    injected: "<script>",
  });
  assert.equal(a.deviceModel, "");
  assert.equal(a.story.length, 100);
  assert.deepEqual(a.plans, ["家庭共享", "备用网络"]);
  assert.equal(a.consent, false);
  assert.equal(Object.hasOwn(a, "injected"), false);
});
test("editing copies are independent, so cancellation cannot change the submitted answer", () => {
  const application = valid();
  const draft = sanitizeApplication(application);
  draft.plans.push("备用网络");
  draft.deviceModel = "AK68";
  assert.deepEqual(application.plans, ["家庭共享"]);
  assert.equal(application.deviceModel, "C2000 Pro");
});
test("validation points to required fields and permits empty optional stories and no publication consent", () => {
  assert.deepEqual(validateApplication(valid()), {});
  assert.equal(
    validateApplication({ ...valid(), deviceModel: " " }).deviceModel,
    "补充一下设备型号",
  );
  assert.ok(
    validateApplication({ ...valid(), feesAccepted: false }).feesAccepted,
  );
  assert.ok(
    validateApplication({
      ...valid(),
      plans: ["家庭共享", "备用网络", "双网络聚合"],
    }).plans,
  );
});
test("storage failures are surfaced without losing in-memory state", () => {
  const application = valid();
  assert.equal(
    persistState(
      { application },
      {
        setItem: () => {
          throw new Error("full");
        },
      },
    ),
    false,
  );
  assert.equal(application.deviceModel, "C2000 Pro");
});
