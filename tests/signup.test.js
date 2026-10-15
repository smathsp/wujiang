import test from "node:test";
import assert from "node:assert/strict";
import {
  blankApplication,
  completedQuestions,
  CORE_FIELDS,
  sanitizeApplication,
  validateApplication,
  readState,
  persistState,
  toggleChoice,
  EXCLUSIVE,
  toggleDeviceModel,
  OPTIONS,
  LIMITS,
} from "../src/model.js";
import { blankApplication as blankV3 } from "../src/previous-model-v3.js";
import {
  validLocation,
  cityFromResult,
  searchCities,
} from "../src/location.js";
const valid = () => ({
  ...blankApplication(),
  location: { province: "浙江省", city: "杭州市" },
  audience: "我自己",
  device: ["Ultra"],
  usage: "80",
  activities: ["办公"],
  access: ["手机套餐 / 热点"],
  problems: ["网络不稳定、卡顿或延迟高"],
  story: "出差时用 CPE 开会，希望有一张按需购买流量的备用卡。",
  startTime: "还没确定，先了解资费",
  priorities: ["费用", "稳定性"],
  experience: "暂时没有",
  discussion: "暂无",
  discussionChoice: "暂时没有",
  feesAccepted: true,
});
const old = () => ({
  ...blankV3(),
  audience: "家里多人一起用",
  sharedCount: "3 人",
  devices: ["Ultra · 已收到", "家里闲置的 CPE"],
  deviceModel: "AK68",
  idleCount: "1 台",
  usage: "51—100GB",
  problems: ["CPE 闲着，没有合适流量"],
  unicomExperience: "没用过，不清楚",
  habits: ["刷视频、聊天、浏览网页"],
  plans: ["给家人共享流量"],
  startTime: "收卡后就开始",
  story: "家人想临时上网",
  feesAccepted: true,
});
const readRecord = (application) =>
  readState({
    getItem: () =>
      JSON.stringify({ signedIn: true, application, draft: application }),
  });
test("all twelve questions required, honest none/unknown answers accepted, consent and card quantity absent", () => {
  assert.deepEqual(validateApplication(valid()), {});
  assert.equal(completedQuestions(valid()), 12);
  assert.equal(completedQuestions(blankApplication()), 0);
  for (const field of CORE_FIELDS)
    assert.ok(validateApplication(blankApplication())[field], field);
  assert.ok(
    !(
      "consent" in
      sanitizeApplication({ ...valid(), consent: true, cardCount: 3 })
    ),
  );
  assert.ok(
    !("cardCount" in sanitizeApplication({ ...valid(), cardCount: 3 })),
  );
});
test("conditional answers required and stale hidden data discarded", () => {
  const v = {
    ...valid(),
    audience: "其他人",
    device: ["其他 CPE"],
    activities: ["其他用途"],
    access: ["其他方式", "CPE 流量卡"],
    problems: ["其他问题"],
    priorities: ["其他方面"],
    experience: "有，想说说",
  };
  const fields = [
    "relationship",
    "deviceModel",
    "activityOther",
    "accessOther",
    "currentSetup",
    "problemOther",
    "priorityOther",
    "experienceStory",
  ];
  for (const field of fields) assert.ok(validateApplication(v)[field], field);
  for (const field of fields) v[field] = "真实情况";
  assert.deepEqual(validateApplication(v), {});
  const switched = sanitizeApplication({
    ...valid(),
    ...Object.fromEntries(fields.map((k) => [k, "旧答案"])),
  });
  for (const field of fields) assert.equal(switched[field], "", field);
});
test("numeric monthly use supports zero and decimals; rejects invalid values; unknown clears input", () => {
  for (const usage of ["0", "10.5", "3000"])
    assert.ok(!validateApplication({ ...valid(), usage }).usage);
  for (const usage of ["", " ", "-1", "NaN", "1e3", "20GB", "0.001"])
    assert.ok(validateApplication({ ...valid(), usage }).usage);
  assert.ok(
    !validateApplication({ ...valid(), usage: "", usageUnknown: true }).usage,
  );
  assert.equal(
    sanitizeApplication({ ...valid(), usageUnknown: true }).usage,
    "",
  );
});
test("priorities remain limited to two; multiple problems and exclusivity survive restoration", () => {
  assert.ok(
    validateApplication({ ...valid(), priorities: ["费用", "速度", "售后"] })
      .priorities,
  );
  assert.deepEqual(toggleChoice(["费用", "速度"], "售后", true, 2), [
    "费用",
    "速度",
  ]);
  const problems = OPTIONS.problems.slice(0, 5);
  assert.deepEqual(validateApplication({ ...valid(), problems }), {});
  assert.deepEqual(
    readRecord({ ...valid(), problems }).application.problems,
    problems,
  );
  assert.deepEqual(
    toggleChoice(
      problems.slice(0, 2),
      problems[2],
      true,
      LIMITS.problems,
      EXCLUSIVE.problems,
    ),
    problems.slice(0, 3),
  );
  assert.deepEqual(
    toggleChoice(
      ["其他问题"],
      "暂无明显问题，想先了解",
      true,
      2,
      EXCLUSIVE.problems,
    ),
    ["暂无明显问题，想先了解"],
  );
  assert.deepEqual(
    sanitizeApplication({
      ...valid(),
      problems: ["其他问题", "暂无明显问题，想先了解"],
      problemOther: "旧问题",
    }).problems,
    ["暂无明显问题，想先了解"],
  );
  assert.equal(
    sanitizeApplication({
      ...valid(),
      problems: ["其他问题", "暂无明显问题，想先了解"],
      problemOther: "旧问题",
    }).problemOther,
    "",
  );
});
test("hidden long answers survive draft reload but are omitted from the submitted response", () => {
  const draft = {
    ...valid(),
    discussionChoice: "暂时没有",
    discussion: "希望了解单 GB 费用和流量提醒。",
    experience: "暂时没有",
    experienceStory: "出差开会时网络断了，希望备用卡能随时用。",
  };
  let stored;
  const storage = {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
  };
  assert.equal(persistState({ signedIn: true, draft }, storage), true);
  const restored = readState(storage).draft;
  assert.equal(restored.discussion, draft.discussion);
  assert.equal(restored.experienceStory, draft.experienceStory);
  assert.deepEqual(validateApplication(restored), {});
  restored.discussionChoice = "有想说的";
  restored.experience = "有，想说说";
  assert.deepEqual(validateApplication(restored), {});
  restored.discussionChoice = "暂时没有";
  restored.experience = "暂时没有";
  const submitted = sanitizeApplication(restored);
  assert.equal(submitted.discussion, "暂无");
  assert.equal(submitted.experienceStory, "");
  assert.equal(restored.discussion, draft.discussion);
  assert.equal(restored.experienceStory, draft.experienceStory);
});
test("location stores only valid province/city; municipalities stay city-level", () => {
  assert.equal(validLocation({ province: "浙江省", city: "北京市" }), false);
  assert.equal(validLocation({ province: "北京市", city: "北京市" }), true);
  assert.equal(validLocation({ province: "北京市", city: "朝阳区" }), false);
  const result = cityFromResult({
    principalSubdivision: "浙江",
    city: "杭州",
    latitude: 30,
    longitude: 120,
  });
  assert.deepEqual(result, { province: "浙江省", city: "杭州市" });
  assert.deepEqual(
    cityFromResult({ principalSubdivision: "北京市", city: "朝阳区" }),
    { province: "北京市", city: "北京市" },
  );
  assert.equal(
    cityFromResult({ principalSubdivision: "浙江省", city: "Unknown" }),
    null,
  );
  assert.deepEqual(
    sanitizeApplication({
      ...valid(),
      location: { ...result, latitude: 30, longitude: 120 },
    }).location,
    result,
  );
});
test("existing v3 submissions retain multiple devices without inventing exact GB", () => {
  const first = readRecord(old());
  assert.ok(first.application);
  assert.deepEqual(first.application.device, ["Ultra", "其他 CPE"]);
  assert.equal(first.application.usage, "");
  assert.equal(first.application.audience, "自己和家人一起用");
  assert.deepEqual(first.application.previous.devices, old().devices);
  const again = readRecord(first.application);
  assert.deepEqual(again.application, first.application);
  const draft = sanitizeApplication({
    ...first.draft,
    device: ["其他 CPE"],
    deviceModel: "AK68",
    usage: "70",
  });
  assert.equal(draft.deviceModel, "AK68");
  assert.equal(draft.usage, "70");
  assert.ok(validateApplication(draft).discussion);
});
test("v1/v2 submitted records remain received through multiple migrations", () => {
  const v1 = {
    audience: "父母或家人",
    device: "Ultra，已经收到",
    usage: "50GB 以内",
    plans: ["家庭共享"],
    feesAccepted: true,
  };
  const v2 = {
    schemaVersion: 2,
    device: "AK68 系列",
    deviceModel: "AK68-788",
    scenario: "其他场景",
    scenarioOther: "露营",
    usage: "50GB 以内",
    networkProblem: "其他问题",
    networkProblemOther: "偶尔用",
    story: "露营时使用",
    feesAccepted: true,
  };
  for (const value of [v1, v2]) {
    const state = readRecord(value);
    assert.ok(state.application);
    assert.deepEqual(
      readRecord(state.application).application,
      state.application,
    );
  }
});
test("new submissions cannot bypass requirements using old metadata; saved edits clone arrays", () => {
  const migrated = sanitizeApplication(old());
  assert.equal(readRecord({ ...migrated, schemaVersion: 4 }).application, null);
  const submitted = sanitizeApplication({ ...valid(), previous: old() });
  assert.ok(readRecord(submitted).application);
  const edited = sanitizeApplication(submitted);
  edited.activities.push("学习");
  edited.location.city = "宁波市";
  assert.deepEqual(submitted.activities, ["办公"]);
  assert.equal(submitted.location.city, "杭州市");
});
test("storage failures are non-fatal", () => {
  assert.equal(readState({ getItem: () => "{" }).application, null);
  assert.equal(
    persistState(
      {},
      {
        setItem: () => {
          throw Error("blocked");
        },
      },
    ),
    false,
  );
});

test("device selection accepts both devices, keeps prior single answers, and clears hidden model", () => {
  const multiple = {
    ...valid(),
    device: ["Ultra", "其他 CPE"],
    deviceModel: "AK68",
  };
  assert.deepEqual(validateApplication(multiple), {});
  assert.deepEqual(readRecord(multiple).application.device, [
    "Ultra",
    "其他 CPE",
  ]);
  const singleRecord = readRecord({ ...valid(), device: "Ultra" });
  assert.deepEqual(singleRecord.application.device, ["Ultra"]);
  assert.deepEqual(readRecord(singleRecord.application).application.device, [
    "Ultra",
  ]);
  const undecided = sanitizeApplication({
    ...multiple,
    device: ["Ultra", "其他 CPE", "暂未确定设备"],
  });
  assert.deepEqual(undecided.device, ["暂未确定设备"]);
  assert.equal(undecided.deviceModel, "");
  assert.ok(validateApplication({ ...multiple, device: [] }).device);
});

test("quick answers migrate existing text and keep custom answers intact", () => {
  const legacy = {
    ...valid(),
    audience: "其他人",
    relationship: "同事",
    relationshipKind: undefined,
    discussion: "想了解计费",
    discussionChoice: undefined,
  };
  const restored = readRecord(legacy).application;
  assert.equal(restored.relationshipKind, "其他");
  assert.equal(restored.relationship, "同事");
  assert.equal(restored.discussionChoice, "有想说的");
  assert.equal(restored.discussion, "想了解计费");
  const quick = sanitizeApplication({
    ...valid(),
    audience: "其他人",
    relationshipKind: "父母",
    relationship: "旧答案",
  });
  assert.equal(quick.relationship, "父母");
  const custom = sanitizeApplication({
    ...quick,
    relationshipKind: "其他",
    relationship: "",
  });
  assert.ok(validateApplication(custom).relationship);
  const none = sanitizeApplication({
    ...valid(),
    discussionChoice: "暂时没有",
    discussion: "旧意见",
  });
  assert.equal(none.discussion, "暂无");
  assert.deepEqual(validateApplication(none), {});
  assert.ok(
    validateApplication({
      ...none,
      discussionChoice: "有想说的",
      discussion: "",
    }).discussion,
  );
});
test("model shortcuts preserve arbitrary models and do not truncate long answers", () => {
  assert.equal(toggleDeviceModel("自有设备X", "AK68"), "自有设备X、AK68");
  assert.equal(toggleDeviceModel("自有设备X、AK68", "AK68"), "自有设备X");
  assert.equal(toggleDeviceModel("X".repeat(80), "AK68"), null);
});
test("city search matches city or province locally, with explicit empty results", () => {
  assert.deepEqual(searchCities("杭州"), [
    { province: "浙江省", city: "杭州市" },
  ]);
  assert.ok(searchCities("浙江").every((item) => item.province === "浙江省"));
  assert.deepEqual(searchCities("浙江 杭州"), [
    { province: "浙江省", city: "杭州市" },
  ]);
  assert.deepEqual(searchCities("没有这个城市"), []);
  assert.deepEqual(searchCities(" "), []);
});
