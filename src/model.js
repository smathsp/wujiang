import {
  sanitizeApplication as sanitizeV3,
  validateApplication as validateV3,
} from "./previous-model-v3.js";
import { isPreviousSubmission } from "./legacy-model.js";
import { validLocation } from "./location.js";
export { toggleChoice } from "./previous-model-v3.js";
export const STORAGE_KEY = "wujiang.signup.v1";
export const OPTIONS = Object.freeze({
  audience: ["我自己", "其他人", "自己和家人一起用"],
  relationshipKind: ["父母", "伴侣", "其他家人", "朋友", "其他"],
  discussionChoice: ["有想说的", "暂时没有"],
  device: ["Ultra", "其他 CPE", "暂未确定设备"],
  activities: [
    "打游戏",
    "看视频、追剧",
    "看直播",
    "开直播",
    "办公",
    "学习",
    "其他用途",
  ],
  access: [
    "家用宽带 / Wi-Fi",
    "手机套餐 / 热点",
    "CPE 流量卡",
    "公共 Wi-Fi",
    "其他方式",
  ],
  problems: [
    "套餐用不完，仍要交月费",
    "人或设备各买套餐，开支分散",
    "备用设备少用，套餐照付",
    "CPE 闲着，没有合适流量",
    "现有流量经常不够用",
    "网络不稳定、卡顿或延迟高",
    "计费规则或售后不清楚",
    "暂无明显问题，想先了解",
    "其他问题",
  ],
  startTime: [
    "拿到卡后就充值使用",
    "一个月内开始使用",
    "等设备准备好后使用",
    "还没确定，先了解资费",
  ],
  priorities: [
    "费用",
    "流量",
    "速度",
    "稳定性",
    "共享使用",
    "售后",
    "其他方面",
  ],
  experience: ["有，想说说", "暂时没有"],
});
export const EXCLUSIVE = Object.freeze({
  device: ["暂未确定设备"],
  problems: ["暂无明显问题，想先了解"],
});
export const LIMITS = Object.freeze({
  device: 2,
  activities: 7,
  access: 5,
  problems: OPTIONS.problems.length,
  priorities: 2,
});
export const CORE_FIELDS = [
  "location",
  "audience",
  "device",
  "usage",
  "activities",
  "access",
  "problems",
  "story",
  "startTime",
  "priorities",
  "experience",
  "discussion",
];
export function blankApplication() {
  return {
    schemaVersion: 4,
    location: { province: "", city: "" },
    audience: "",
    relationship: "",
    relationshipKind: "",
    device: [],
    deviceModel: "",
    usage: "",
    usageUnknown: false,
    activities: [],
    activityOther: "",
    access: [],
    currentSetup: "",
    accessOther: "",
    problems: [],
    problemOther: "",
    story: "",
    startTime: "",
    priorities: [],
    priorityOther: "",
    experience: "",
    experienceStory: "",
    discussion: "",
    discussionChoice: "",
    feesAccepted: false,
    previous: null,
  };
}
const text = (value, max) =>
  typeof value === "string" ? value.slice(0, max) : "";
function migrate(previous) {
  const prior = previous.previous;
  const audience =
    previous.audience === "我自己"
      ? "我自己"
      : previous.audience === "家里多人一起用"
        ? "自己和家人一起用"
        : ["父母或长辈", "伴侣或其他家人"].includes(previous.audience)
          ? "其他人"
          : "";
  const device = [
    ...new Set(
      previous.devices
        .map((value) =>
          value.startsWith("Ultra")
            ? "Ultra"
            : ["其他在用的 CPE", "家里闲置的 CPE"].includes(value)
              ? "其他 CPE"
              : value === "暂时没有设备"
                ? "暂未确定设备"
                : "",
        )
        .filter(Boolean),
    ),
  ];
  const problemMap = {
    "家人各买套餐，管理麻烦": OPTIONS.problems[1],
    "游戏、会议或上网不稳定": OPTIONS.problems[5],
    "暂无明显问题，先了解": OPTIONS.problems[7],
  };
  return {
    audience,
    relationship: audience === "其他人" ? previous.audience : "",
    device,
    deviceModel: device.includes("其他 CPE") ? previous.deviceModel : "",
    problems: previous.problems.map((v) => problemMap[v] || v),
    problemOther: previous.problemOther,
    story: previous.story || prior?.story || "",
    usageUnknown: previous.usage === "没查过，不清楚",
    feesAccepted: previous.feesAccepted,
  };
}
export function sanitizeApplication(input, { preserveDraftText = false } = {}) {
  const source = input && typeof input === "object" ? input : {};
  const old =
    [1, 2, 3].includes(source.schemaVersion) ||
    (!source.schemaVersion && ("devices" in source || "device" in source));
  const previous = old
    ? sanitizeV3("location" in source ? source.previous : source)
    : source.previous
      ? sanitizeV3(source.previous)
      : null;
  const values = old ? migrate(previous) : source;
  const clean = blankApplication();
  clean.schemaVersion = old ? previous.schemaVersion : 4;
  clean.previous = previous;
  // Canonical migrated records already have the new shape. Preserve edits on reload.
  const v = old && "location" in source ? source : values;
  if (validLocation(v.location))
    clean.location = {
      province: v.location.province,
      city: v.location.city.trim(),
    };
  for (const key of ["audience", "startTime", "experience"])
    if (OPTIONS[key].includes(v[key])) clean[key] = v[key];
  for (const key of Object.keys(LIMITS)) {
    // The previous single-device answer remains a valid selection after upgrade.
    const values =
      key === "device" && typeof v[key] === "string" ? [v[key]] : v[key];
    const selected = Array.isArray(values)
      ? [...new Set(values.filter((item) => OPTIONS[key].includes(item)))]
      : [];
    const exclusive = selected.find((item) => EXCLUSIVE[key]?.includes(item));
    clean[key] = exclusive ? [exclusive] : selected.slice(0, LIMITS[key]);
  }
  if (clean.audience === "其他人") {
    const relationship = text(v.relationship, 30);
    clean.relationshipKind = OPTIONS.relationshipKind.includes(
      v.relationshipKind,
    )
      ? v.relationshipKind
      : relationship.trim()
        ? OPTIONS.relationshipKind.slice(0, -1).includes(relationship)
          ? relationship
          : "其他"
        : "";
    clean.relationship =
      clean.relationshipKind === "其他" ? relationship : clean.relationshipKind;
  }
  clean.deviceModel = clean.device.includes("其他 CPE")
    ? text(v.deviceModel, 80)
    : "";
  clean.usageUnknown = v.usageUnknown === true;
  clean.usage = clean.usageUnknown ? "" : text(v.usage, 12);
  for (const [field, parent, option, max] of [
    ["activityOther", "activities", "其他用途", 80],
    ["accessOther", "access", "其他方式", 80],
    ["problemOther", "problems", "其他问题", 100],
    ["priorityOther", "priorities", "其他方面", 80],
  ])
    clean[field] = clean[parent].includes(option) ? text(v[field], max) : "";
  clean.currentSetup = clean.access.includes("CPE 流量卡")
    ? text(v.currentSetup, 100)
    : "";
  clean.story = text(v.story, 100);
  clean.experienceStory =
    preserveDraftText || clean.experience === "有，想说说"
      ? text(v.experienceStory, 200)
      : "";
  const discussion = text(v.discussion, 150);
  clean.discussionChoice = OPTIONS.discussionChoice.includes(v.discussionChoice)
    ? v.discussionChoice
    : discussion.trim()
      ? ["暂无", "暂时没有", "没有", "无"].includes(discussion.trim())
        ? "暂时没有"
        : "有想说的"
      : "";
  clean.discussion =
    !preserveDraftText && clean.discussionChoice === "暂时没有"
      ? "暂无"
      : discussion;
  clean.feesAccepted = v.feesAccepted === true;
  return clean;
}
export function validateApplication(value) {
  const errors = {};
  const pick = (key, message) => {
    if (!OPTIONS[key].includes(value[key])) errors[key] = message;
  };
  const requiredText = (key, message, max) => {
    if (
      typeof value[key] !== "string" ||
      !value[key].trim() ||
      value[key].length > max
    )
      errors[key] = message;
  };
  const multi = (key, message) => {
    const values = value[key];
    if (
      !Array.isArray(values) ||
      !values.length ||
      values.length > LIMITS[key] ||
      new Set(values).size !== values.length ||
      values.some((v) => !OPTIONS[key].includes(v)) ||
      (values.length > 1 && values.some((v) => EXCLUSIVE[key]?.includes(v)))
    )
      errors[key] = message;
  };
  if (!validLocation(value.location))
    errors.location = "请定位或手动选择使用城市";
  pick("audience", "请选择主要给谁使用");
  if (value.audience === "其他人")
    requiredText("relationship", "请填写使用对象，如父母或朋友", 30);
  multi("device", "请选择准备使用的设备");
  if (value.device?.includes("其他 CPE"))
    requiredText("deviceModel", "请填写设备型号", 80);
  if (
    value.usageUnknown !== true &&
    !(
      typeof value.usage === "string" &&
      /^\d+(\.\d{1,2})?$/.test(value.usage.trim()) &&
      Number.isFinite(Number(value.usage)) &&
      Number(value.usage) >= 0 &&
      value.usage.length <= 12
    )
  )
    errors.usage = "请填写每月 GB 用量，或选择暂时不清楚";
  multi("activities", "请选择平时的流量用途");
  multi("access", "请选择目前的上网方式");
  multi("problems", "请选择遇到的问题，也可选择暂无明显问题");
  for (const [field, parent, option, max, message] of [
    ["activityOther", "activities", "其他用途", 80, "请补充其他流量用途"],
    ["accessOther", "access", "其他方式", 80, "请补充目前的上网方式"],
    ["problemOther", "problems", "其他问题", 100, "请说说你遇到的其他问题"],
    ["priorityOther", "priorities", "其他方面", 80, "请补充你在意的方面"],
  ])
    if (value[parent]?.includes(option)) requiredText(field, message, max);
  if (value.access?.includes("CPE 流量卡"))
    requiredText(
      "currentSetup",
      "请填写当前设备、套餐；不清楚套餐名称也可以说明",
      100,
    );
  requiredText("story", "请用 100 字以内说说你希望解决的具体问题", 100);
  pick("startTime", "请选择预计开始使用的时间");
  multi("priorities", "请选择最在意的 1—2 个方面");
  pick("experience", "请选择是否有想分享的经历");
  if (value.experience === "有，想说说")
    requiredText("experienceStory", "请用 200 字以内分享一次真实经历", 200);
  if (!OPTIONS.discussionChoice.includes(value.discussionChoice))
    errors.discussion = "请选择是否有想说的";
  else if (value.discussionChoice === "有想说的")
    requiredText("discussion", "请写下你的疑问或吐槽", 150);
  if (!value.feesAccepted) errors.feesAccepted = "请确认领取和计费说明";
  return errors;
}
export function completedQuestions(value) {
  const errors = validateApplication(value);
  const groups = [
    ["location"],
    ["audience", "relationship"],
    ["device", "deviceModel"],
    ["usage"],
    ["activities", "activityOther"],
    ["access", "accessOther", "currentSetup"],
    ["problems", "problemOther"],
    ["story"],
    ["startTime"],
    ["priorities", "priorityOther"],
    ["experience", "experienceStory"],
    ["discussion"],
  ];
  return groups.filter((fields) => fields.every((key) => !errors[key])).length;
}
export function readState(storage) {
  let saved;
  try {
    saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
  } catch {
    saved = null;
  }
  const application = saved?.application
    ? sanitizeApplication(saved.application)
    : null;
  const previous = application?.previous;
  const accepted =
    application &&
    (application.schemaVersion < 4
      ? previous &&
        (previous.schemaVersion < 3
          ? previous.previous && isPreviousSubmission(previous.previous)
          : !Object.keys(validateV3(previous)).length)
      : !Object.keys(validateApplication(application)).length);
  return {
    signedIn: saved?.signedIn === true,
    introSeen: saved?.introSeen === true,
    application: accepted ? application : null,
    draft: sanitizeApplication(saved?.draft, { preserveDraftText: true }),
    updatedAt: typeof saved?.updatedAt === "string" ? saved.updatedAt : null,
  };
}
export function persistState(state, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const DEVICE_MODELS = ["C2000 Pro", "C2000 Pro Max", "AK68"];
export const splitDeviceModels = (value) =>
  String(value || "")
    .split(/[、，,；;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
export function toggleDeviceModel(value, model) {
  const models = splitDeviceModels(value);
  const next = models.includes(model)
    ? models.filter((item) => item !== model)
    : [...models, model];
  const answer = [...new Set(next)].join("、");
  return answer.length <= 80 ? answer : null;
}
