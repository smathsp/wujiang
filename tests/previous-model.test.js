import test from "node:test";
import assert from "node:assert/strict";
import {
  blankApplication,
  completedQuestions,
  EXCLUSIVE,
  OPTIONS,
  persistState,
  readState,
  sanitizeApplication,
  STORAGE_KEY,
  toggleChoice,
  validateApplication,
} from "../src/previous-model-v3.js";
const valid = () => ({
  ...blankApplication(),
  audience: "家里多人一起用",
  sharedCount: "3 人",
  devices: ["Ultra · 已收到", "家里闲置的 CPE"],
  deviceModel: "C2000 Pro、AK68",
  idleCount: "2 台",
  usage: "51—100GB",
  problems: ["CPE 闲着，没有合适流量"],
  unicomExperience: "没用过，不清楚",
  habits: ["刷视频、聊天、浏览网页"],
  plans: ["给家人共享流量"],
  startTime: "收卡后就开始",
  story: "爸妈用量不多，想让两台闲置设备共享流量。",
  feesAccepted: true,
});
const legacy = () => ({
  audience: "父母或家人",
  device: "Ultra，已经收到",
  usage: "50GB 以内",
  plans: ["家庭共享"],
  story: "",
  feesAccepted: true,
  consent: false,
});
const v2 = () => ({
  schemaVersion: 2,
  audience: "",
  plans: [],
  device: "AK68 系列",
  deviceModel: "AK68-788",
  scenario: "其他场景",
  scenarioOther: "周末露营",
  usage: "50GB 以内",
  networkProblem: "其他问题",
  networkProblemOther: "设备只偶尔使用",
  story: "露营时给家人临时上网。",
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

test("all nine core questions are required, optional questions and publication consent are not", () => {
  assert.deepEqual(validateApplication(valid()), {});
  assert.equal(completedQuestions(valid()), 9);
  assert.equal(completedQuestions(blankApplication()), 0);
  const errors = validateApplication(blankApplication());
  for (const key of [
    "audience",
    "devices",
    "usage",
    "problems",
    "unicomExperience",
    "habits",
    "plans",
    "startTime",
    "story",
    "feesAccepted",
  ])
    assert.ok(errors[key], key);
  assert.equal(valid().consent, false);
  assert.deepEqual(readRecord(valid()).application, valid());
});
test("conditional follow-ups count toward their parent question and are only required when shown", () => {
  const input = {
    ...valid(),
    sharedCount: "",
    deviceModel: " ",
    idleCount: "",
    problems: ["其他问题"],
    plans: ["双网络分流或聚合"],
  };
  const errors = validateApplication(input);
  for (const key of [
    "sharedCount",
    "deviceModel",
    "idleCount",
    "problemOther",
    "aggregationReadiness",
  ])
    assert.ok(errors[key], key);
  assert.equal(completedQuestions(input), 5);
  assert.deepEqual(
    validateApplication({
      ...input,
      audience: "我自己",
      devices: ["暂时没有设备"],
      problems: ["暂无明显问题，先了解"],
      plans: ["先看教程，再决定"],
    }),
    {},
  );
});
test("exclusive choices replace other answers and bounded choices reject a third selection", () => {
  const options = OPTIONS.problems;
  let choices = toggleChoice([], options[0], true, 2, EXCLUSIVE.problems);
  choices = toggleChoice(choices, options[1], true, 2, EXCLUSIVE.problems);
  assert.deepEqual(
    toggleChoice(choices, options[2], true, 2, EXCLUSIVE.problems),
    choices,
  );
  choices = toggleChoice(choices, options[6], true, 2, EXCLUSIVE.problems);
  assert.deepEqual(choices, [options[6]]);
  assert.deepEqual(
    toggleChoice(choices, options[0], true, 2, EXCLUSIVE.problems),
    [options[0]],
  );
  assert.ok(
    validateApplication({ ...valid(), problems: [options[0], options[6]] })
      .problems,
  );
  assert.ok(
    validateApplication({ ...valid(), plans: OPTIONS.plans.slice(0, 3) }).plans,
  );
});
test("hidden follow-up data is removed and free text is bounded", () => {
  const clean = sanitizeApplication({
    ...valid(),
    audience: "我自己",
    devices: ["暂时没有设备", "Ultra · 已收到"],
    problems: ["暂无明显问题，先了解", "其他问题"],
    problemOther: "obsolete",
    aggregationReadiness: "有设备，也有经验",
    liveQuestionOther: "obsolete",
    story: "字".repeat(180),
    city: "市".repeat(50),
    consent: "true",
    injected: "<script>",
  });
  assert.deepEqual(clean.devices, ["暂时没有设备"]);
  for (const key of [
    "sharedCount",
    "deviceModel",
    "idleCount",
    "problemOther",
    "aggregationReadiness",
    "liveQuestionOther",
  ])
    assert.equal(clean[key], "", key);
  assert.equal(clean.story.length, 150);
  assert.equal(clean.city.length, 30);
  assert.equal(clean.consent, false);
  assert.equal(Object.hasOwn(clean, "injected"), false);
});
test("both previous submission versions remain received without invented answers", () => {
  for (const previous of [legacy(), v2()]) {
    const state = readRecord(previous);
    assert.ok(state.application);
    assert.deepEqual(state.application.devices, []);
    assert.equal(state.application.usage, ""); // <=50 cannot be guessed as <=20 or 21–50.
    assert.equal(state.application.unicomExperience, "");
    assert.equal(state.application.previous.usage, "50GB 以内");
    assert.equal(
      state.application.previous.device,
      previous.schemaVersion === 2 ? "AK68 系列" : "Ultra",
    );
    assert.equal(state.application.consent, false);
    assert.deepEqual(
      readRecord(state.application).application,
      state.application,
    );
  }
});
test("editing a previous record and resubmitting produces a valid current record", () => {
  const old = readRecord(v2()).application;
  const application = sanitizeApplication({
    ...old,
    ...valid(),
    previous: old.previous,
    schemaVersion: 3,
  });
  assert.equal(application.schemaVersion, 3);
  assert.equal(application.previous.deviceModel, "AK68-788");
  assert.deepEqual(readRecord(application).application, application);
  const draft = sanitizeApplication(application);
  draft.devices.push("其他在用的 CPE");
  draft.previous.plans.push("备用网络");
  assert.equal(application.devices.length, 2);
  assert.deepEqual(application.previous.plans, []);
});
test("incomplete records cannot use old metadata to become successful registrations", () => {
  assert.equal(readRecord({}).application, null);
  assert.equal(
    readRecord({
      ...v2(),
      networkProblem: "",
      audience: "父母或家人",
      plans: ["家庭共享"],
    }).application,
    null,
  );
  assert.equal(
    readRecord({
      ...valid(),
      unicomExperience: "",
      previous: readRecord(v2()).application.previous,
    }).application,
    null,
  );
  assert.equal(readState({ getItem: () => "{broken" }).application, null);
});
test("storage failures preserve current in-memory answers", () => {
  assert.deepEqual(
    readState({
      getItem: () => {
        throw Error("blocked");
      },
    }).draft,
    blankApplication(),
  );
  const application = valid();
  assert.equal(
    persistState(
      { application },
      {
        setItem: () => {
          throw Error("full");
        },
      },
    ),
    false,
  );
  assert.equal(application.deviceModel, "C2000 Pro、AK68");
});
