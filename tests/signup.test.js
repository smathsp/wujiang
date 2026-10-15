import test from "node:test";
import assert from "node:assert/strict";
import {
  blankApplication,
  deviceNeedsModel,
  persistState,
  readState,
  sanitizeApplication,
  STORAGE_KEY,
  validateApplication,
} from "../src/model.js";
const valid = () => ({
  ...blankApplication(),
  device: "C2000 系列",
  deviceModel: "C2000 Pro",
  scenario: "家庭共享",
  usage: "50GB 以内",
  networkProblem: "闲置设备缺合适套餐",
  story: "让爸妈用两台闲置设备共享流量。",
  feesAccepted: true,
});
const legacy = () => ({
  audience: "父母或家人",
  device: "Ultra，已经收到",
  deviceModel: "",
  usage: "50GB 以内",
  plans: ["家庭共享"],
  story: "",
  feesAccepted: true,
  consent: false,
});
const readRecord = (application) =>
  readState({
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

test("earlier submissions retain their received state without invented new answers", () => {
  const state = readRecord(legacy());
  assert.equal(state.signedIn, true);
  assert.equal(state.application.device, "Ultra");
  assert.equal(state.application.schemaVersion, 1);
  assert.equal(state.application.scenario, "");
  assert.equal(state.application.networkProblem, "");
  assert.deepEqual(state.application.plans, ["家庭共享"]);
  assert.equal(state.application.consent, false);
  assert.ok(validateApplication(state.application).story);
});
test("all five new answers are required; public display consent remains optional", () => {
  assert.deepEqual(validateApplication(valid()), {});
  const empty = validateApplication(blankApplication());
  for (const key of ["device", "scenario", "usage", "networkProblem", "story"])
    assert.ok(empty[key]);
  assert.ok(validateApplication({ ...valid(), story: "  " }).story);
  assert.equal(valid().consent, false);
  assert.deepEqual(readRecord(valid()).application, valid());
});
test("conditional device, scenario, and problem descriptions are required only when shown", () => {
  assert.equal(deviceNeedsModel("Ultra"), false);
  assert.equal(deviceNeedsModel("AK68 系列"), true);
  assert.ok(validateApplication({ ...valid(), deviceModel: " " }).deviceModel);
  assert.ok(
    validateApplication({ ...valid(), scenario: "其他场景", scenarioOther: "" })
      .scenarioOther,
  );
  assert.ok(
    validateApplication({
      ...valid(),
      networkProblem: "其他问题",
      networkProblemOther: "",
    }).networkProblemOther,
  );
  assert.deepEqual(
    validateApplication({
      ...valid(),
      device: "Ultra",
      deviceModel: "",
      scenario: "其他场景",
      scenarioOther: "露营",
      networkProblem: "其他问题",
      networkProblemOther: "只在周末偶尔使用",
    }),
    {},
  );
});
test("corrupt and incomplete new records do not become successful registrations", () => {
  assert.equal(readState({ getItem: () => "{broken" }).application, null);
  assert.equal(readRecord({}).application, null);
  assert.equal(
    readRecord({
      ...valid(),
      networkProblem: "",
      audience: "父母或家人",
      plans: ["家庭共享"],
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
test("sanitization limits free text and removes hidden conditional answers", () => {
  const a = sanitizeApplication({
    ...valid(),
    device: "Ultra",
    deviceModel: "obsolete",
    scenarioOther: "obsolete",
    networkProblemOther: "obsolete",
    story: "字".repeat(180),
    consent: "true",
    injected: "<script>",
  });
  assert.equal(a.deviceModel, "");
  assert.equal(a.scenarioOther, "");
  assert.equal(a.networkProblemOther, "");
  assert.equal(a.story.length, 150);
  assert.equal(a.consent, false);
  assert.equal(Object.hasOwn(a, "injected"), false);
});
test("cancelled edits cannot mutate a submitted answer or its legacy metadata", () => {
  const application = sanitizeApplication({ ...valid(), plans: ["家庭共享"] });
  const draft = sanitizeApplication(application);
  draft.plans.push("备用网络");
  draft.networkProblem = "网络卡顿或掉线";
  assert.deepEqual(application.plans, ["家庭共享"]);
  assert.equal(application.networkProblem, "闲置设备缺合适套餐");
});
test("storage errors do not destroy in-memory answers", () => {
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
