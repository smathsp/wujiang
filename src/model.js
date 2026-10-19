import {
  sanitizeApplication as sanitizeV3,
  validateApplication as validateV3,
} from "./previous-model-v3.js";
import { isPreviousSubmission } from "./legacy-model.js";
import { validLocation } from "./location.js";
import {
  DEVICE_OPTIONS,
  DEVICE_OTHER_FIELDS,
  sanitizeDevices,
} from "./devices.js";
export { toggleChoice } from "./previous-model-v3.js";
export const STORAGE_KEY = "wujiang.signup.v1";
export const OPTIONS = Object.freeze({
  audience: ["我自己", "其他人", "自己和家人一起用"],
  relationshipKind: ["父母", "伴侣", "其他家人", "朋友", "其他"],
  discussionChoice: ["有想说的", "暂时没有"],
  device: DEVICE_OPTIONS,
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
  problems: ["暂无明显问题，想先了解"],
});
export const LIMITS = Object.freeze({
  device: DEVICE_OPTIONS.length,
  activities: 7,
  access: 5,
  problems: OPTIONS.problems.length,
  priorities: 2,
});
export const CORE_FIELDS = [
  "location",
  "audience",
  "cardCount",
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
    schemaVersion: 5,
    location: { province: "", city: "" },
    audience: "",
    relationship: "",
    relationshipKind: "",
    cardCount: "",
    device: [],
    deviceModel: "",
    deviceOtherC2000: "",
    deviceOtherAK68: "",
    deviceOtherC8: "",
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
  clean.schemaVersion = old
    ? previous.schemaVersion
    : source.schemaVersion === 4
      ? 4
      : 5;
  clean.previous = previous;
  // Canonical migrated records already have the new shape. Preserve edits on reload.
  const v = old && "location" in source ? source : values;
  // Older versions never asked for a quantity; leave it unanswered when upgrading.
  if (clean.schemaVersion >= 5)
    clean.cardCount =
      typeof v.cardCount === "number"
        ? String(v.cardCount)
        : text(v.cardCount).trim();
  if (validLocation(v.location))
    clean.location = {
      province: v.location.province,
      city: v.location.city.trim(),
    };
  for (const key of ["audience", "startTime", "experience"])
    if (OPTIONS[key].includes(v[key])) clean[key] = v[key];
  for (const key of Object.keys(LIMITS)) {
    if (key === "device") continue;
    const values = v[key];
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
  Object.assign(clean, sanitizeDevices(v, preserveDraftText));
  clean.usageUnknown = v.usageUnknown === true;
  clean.usage = clean.usageUnknown ? "" : text(v.usage, 12);
  for (const [field, parent, option] of [
    ["activityOther", "activities", "其他用途"],
    ["accessOther", "access", "其他方式"],
    ["problemOther", "problems", "其他问题"],
    ["priorityOther", "priorities", "其他方面"],
  ])
    clean[field] = clean[parent].includes(option) ? text(v[field]) : "";
  clean.currentSetup = clean.access.includes("CPE 流量卡")
    ? text(v.currentSetup)
    : "";
  clean.story = text(v.story);
  clean.experienceStory =
    preserveDraftText || clean.experience === "有，想说说"
      ? text(v.experienceStory)
      : "";
  const discussion = text(v.discussion);
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
export function validateApplication(value, { requireCardCount = true } = {}) {
  const errors = {};
  const pick = (key, message) => {
    if (!OPTIONS[key].includes(value[key])) errors[key] = message;
  };
  const requiredText = (key, message, max = Infinity) => {
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
  if (requireCardCount && !validCardCount(value.cardCount))
    errors.cardCount = "请填写领取张数，至少 1 张，填写整数";
  multi("device", "请选择准备使用的设备");
  for (const { option, field, title } of DEVICE_OTHER_FIELDS)
    if (value.device?.includes(option))
      requiredText(field, `请填写${title}`, 80);
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
  for (const [field, parent, option, message] of [
    ["activityOther", "activities", "其他用途", "请补充其他流量用途"],
    ["accessOther", "access", "其他方式", "请补充目前的上网方式"],
    ["problemOther", "problems", "其他问题", "请说说你遇到的其他问题"],
    ["priorityOther", "priorities", "其他方面", "请补充你在意的方面"],
  ])
    if (value[parent]?.includes(option)) requiredText(field, message);
  if (value.access?.includes("CPE 流量卡"))
    requiredText(
      "currentSetup",
      "请填写当前设备、套餐；不清楚套餐名称也可以说明",
    );
  requiredText("story", "请说说你希望解决的具体问题");
  pick("startTime", "请选择预计开始使用的时间");
  multi("priorities", "请选择最在意的 1—2 个方面");
  pick("experience", "请选择是否有想分享的经历");
  if (value.experience === "有，想说说")
    requiredText("experienceStory", "请分享一次真实经历");
  if (!OPTIONS.discussionChoice.includes(value.discussionChoice))
    errors.discussion = "请选择是否有想说的";
  else if (value.discussionChoice === "有想说的")
    requiredText("discussion", "请写下你的疑问或吐槽");
  if (!value.feesAccepted)
    errors.feesAccepted = "请确认领取、计费和激活后发货说明";
  return errors;
}
export function completedQuestions(value) {
  const errors = validateApplication(value);
  const groups = [
    ["location"],
    ["audience", "relationship"],
    ["cardCount"],
    ["device", ...DEVICE_OTHER_FIELDS.map((item) => item.field)],
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
      : !Object.keys(
          validateApplication(application, {
            requireCardCount: application.schemaVersion >= 5,
          }),
        ).length);
  return {
    signedIn: saved?.signedIn === true,
    introSeen: saved?.introSeen === true,
    application: accepted ? application : null,
    draft: prepareDraft(saved?.draft),
    updatedAt: typeof saved?.updatedAt === "string" ? saved.updatedAt : null,
  };
}
export function validCardCount(value) {
  return (
    typeof value === "string" &&
    /^\d+$/.test(value.trim()) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}
export function prepareDraft(value) {
  const draft = sanitizeApplication(value, { preserveDraftText: true });
  if (draft.schemaVersion < 5) draft.feesAccepted = false;
  draft.schemaVersion = 5;
  return draft;
}
export function persistState(state, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
