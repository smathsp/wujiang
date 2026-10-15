import { isPreviousSubmission, sanitizePrevious } from "./legacy-model.js";

export const STORAGE_KEY = "wujiang.signup.v1";
export const OPTIONS = Object.freeze({
  audience: [
    "我自己",
    "父母或长辈",
    "伴侣或其他家人",
    "家里多人一起用",
    "还没确定",
  ],
  sharedCount: ["2 人", "3 人", "4 人", "5 人及以上", "还没确定"],
  devices: [
    "Ultra · 已收到",
    "Ultra · 等待到货",
    "其他在用的 CPE",
    "家里闲置的 CPE",
    "暂时没有设备",
  ],
  idleCount: ["1 台", "2 台", "3 台及以上"],
  usage: [
    "20GB 以内",
    "21—50GB",
    "51—100GB",
    "101—200GB",
    "201—300GB",
    "300GB 以上",
    "没查过，不清楚",
  ],
  problems: [
    "套餐用不完，仍要交月费",
    "家人各买套餐，管理麻烦",
    "备用设备少用，套餐照付",
    "CPE 闲着，没有合适流量",
    "游戏、会议或上网不稳定",
    "现有流量经常不够用",
    "暂无明显问题，先了解",
    "其他问题",
  ],
  unicomExperience: [
    "用过，比较稳定",
    "用过，体验一般",
    "用过，体验较差",
    "没用过，不清楚",
  ],
  habits: [
    "刷视频、聊天、浏览网页",
    "打游戏、视频会议",
    "长时间看高清视频",
    "经常下载大型游戏或文件",
    "每天多次测速",
    "长时间持续下载或上传",
    "还不清楚自己的用量",
  ],
  plans: [
    "日常上网",
    "需要时做备用",
    "给家人共享流量",
    "和天火卡搭配切换",
    "双网络分流或聚合",
    "先看教程，再决定",
  ],
  aggregationReadiness: [
    "有设备，也有经验",
    "有设备，需要教程",
    "还没设备，先了解",
  ],
  startTime: [
    "收卡后就开始",
    "一个月内",
    "等 Ultra 到货",
    "等家人或设备准备好",
    "暂时没有明确时间",
  ],
  monthlyCost: [
    "0 元",
    "30 元以内",
    "31—50 元",
    "51—100 元",
    "100 元以上",
    "不清楚",
    "不便提供",
  ],
  liveQuestions: [
    "单 GB 价格和计费方式",
    "家庭共享的限制",
    "支持哪些设备",
    "流量提醒与费用控制",
    "如何搭配天火卡",
    "双网络分流或聚合教程",
    "其他问题",
  ],
});
export const EXCLUSIVE = Object.freeze({
  devices: ["暂时没有设备"],
  problems: ["暂无明显问题，先了解"],
  habits: ["还不清楚自己的用量"],
  plans: ["先看教程，再决定"],
});
export const LIMITS = Object.freeze({
  devices: 4,
  problems: 2,
  habits: 6,
  plans: 2,
  liveQuestions: 7,
});
export const CORE_FIELDS = [
  "audience",
  "devices",
  "usage",
  "problems",
  "unicomExperience",
  "habits",
  "plans",
  "startTime",
  "story",
];
export const FAMILY_AUDIENCES = OPTIONS.audience.slice(1, 4);
export const HEAVY_HABITS = OPTIONS.habits.slice(2, 6);
export const deviceNeedsModel = (devices) =>
  Array.isArray(devices) &&
  devices.some((v) => ["其他在用的 CPE", "家里闲置的 CPE"].includes(v));
export function toggleChoice(
  current,
  option,
  checked,
  max = Infinity,
  exclusive = [],
) {
  if (!checked) return current.filter((value) => value !== option);
  if (exclusive.includes(option)) return [option];
  const next = current.filter(
    (value) => value !== option && !exclusive.includes(value),
  );
  return next.length < max ? [...next, option] : [...current];
}
export function blankApplication() {
  return {
    schemaVersion: 3,
    audience: "",
    sharedCount: "",
    devices: [],
    deviceModel: "",
    idleCount: "",
    usage: "",
    problems: [],
    problemOther: "",
    unicomExperience: "",
    city: "",
    habits: [],
    plans: [],
    aggregationReadiness: "",
    startTime: "",
    story: "",
    monthlyCost: "",
    liveQuestions: [],
    liveQuestionOther: "",
    feesAccepted: false,
    consent: false,
    previous: null,
  };
}
const text = (value, max) =>
  typeof value === "string" ? value.slice(0, max) : "";
function migratePrevious(previous) {
  const problemMap = {
    套餐用不完仍要交月费: OPTIONS.problems[0],
    家人分别买套餐太麻烦: OPTIONS.problems[1],
    闲置设备缺合适套餐: OPTIONS.problems[3],
    网络卡顿或掉线: OPTIONS.problems[4],
    "游戏 / 会议延迟高": OPTIONS.problems[4],
    流量经常不够用: OPTIONS.problems[5],
    暂无明显问题: OPTIONS.problems[6],
    其他问题: OPTIONS.problems[7],
  };
  return {
    audience:
      previous.audience === "我自己"
        ? "我自己"
        : previous.audience === "家庭多人共享"
          ? "家里多人一起用"
          : "",
    usage: OPTIONS.usage.includes(previous.usage)
      ? previous.usage
      : previous.usage === "不清楚"
        ? "没查过，不清楚"
        : "",
    problems: problemMap[previous.networkProblem]
      ? [problemMap[previous.networkProblem]]
      : [],
    problemOther: previous.networkProblemOther,
    story: previous.story,
    feesAccepted: previous.feesAccepted,
    consent: previous.consent,
  };
}
export function sanitizeApplication(input) {
  const source = input && typeof input === "object" ? input : {};
  const isOld =
    source.schemaVersion === 1 ||
    source.schemaVersion === 2 ||
    (!source.schemaVersion && "device" in source);
  const previous = isOld
    ? sanitizePrevious(source.previous || source)
    : source.previous
      ? sanitizePrevious(source.previous)
      : null;
  const values =
    isOld && !("devices" in source)
      ? { ...migratePrevious(previous), previous }
      : source;
  const clean = blankApplication();
  clean.schemaVersion = isOld ? previous.schemaVersion : 3;
  clean.previous = previous;
  for (const key of [
    "audience",
    "sharedCount",
    "idleCount",
    "usage",
    "unicomExperience",
    "aggregationReadiness",
    "startTime",
    "monthlyCost",
  ])
    if (OPTIONS[key].includes(values[key])) clean[key] = values[key];
  for (const key of Object.keys(LIMITS)) {
    if (Array.isArray(values[key])) {
      const selected = [
        ...new Set(values[key].filter((value) => OPTIONS[key].includes(value))),
      ];
      const exclusive = selected.find((value) =>
        EXCLUSIVE[key]?.includes(value),
      );
      clean[key] = exclusive ? [exclusive] : selected.slice(0, LIMITS[key]);
    }
  }
  if (!FAMILY_AUDIENCES.includes(clean.audience)) clean.sharedCount = "";
  clean.deviceModel = deviceNeedsModel(clean.devices)
    ? text(values.deviceModel, 80)
    : "";
  if (!clean.devices.includes("家里闲置的 CPE")) clean.idleCount = "";
  clean.problemOther = clean.problems.includes("其他问题")
    ? text(values.problemOther, 80)
    : "";
  if (!clean.plans.includes("双网络分流或聚合"))
    clean.aggregationReadiness = "";
  clean.city = text(values.city, 30);
  clean.story = text(values.story, 150);
  clean.liveQuestionOther = clean.liveQuestions.includes("其他问题")
    ? text(values.liveQuestionOther, 100)
    : "";
  clean.feesAccepted = values.feesAccepted === true;
  clean.consent = values.consent === true;
  return clean;
}
export function validateApplication(value) {
  const errors = {};
  const pick = (key, message) => {
    if (!OPTIONS[key].includes(value[key])) errors[key] = message;
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
  pick("audience", "请选择主要给谁使用");
  if (FAMILY_AUDIENCES.includes(value.audience))
    pick("sharedCount", "请选择预计共享人数");
  multi("devices", "请选择准备使用的设备");
  if (deviceNeedsModel(value.devices) && !value.deviceModel.trim())
    errors.deviceModel = "请填写具体设备型号";
  if (value.devices.includes("家里闲置的 CPE"))
    pick("idleCount", "请选择闲置 CPE 的数量");
  pick("usage", "请选择实际月用量，不清楚也可以");
  multi("problems", "请选择 1—2 个最想解决的问题");
  if (value.problems.includes("其他问题") && !value.problemOther.trim())
    errors.problemOther = "简单说说你遇到的问题";
  pick("unicomExperience", "请选择联通网络的使用体验");
  multi("habits", "请选择实际的流量使用习惯");
  multi("plans", "请选择 1—2 种使用方式");
  if (value.plans.includes("双网络分流或聚合"))
    pick("aggregationReadiness", "请选择目前的设备和经验情况");
  pick("startTime", "请选择预计开始使用的时间");
  if (!value.story.trim() || value.story.length > 150)
    errors.story = "用 150 字以内说说你的真实使用场景";
  if (!value.feesAccepted) errors.feesAccepted = "请先确认领取和计费说明";
  return errors;
}
export function completedQuestions(value) {
  const errors = validateApplication(value);
  const groups = [
    ["audience", "sharedCount"],
    ["devices", "deviceModel", "idleCount"],
    ["usage"],
    ["problems", "problemOther"],
    ["unicomExperience"],
    ["habits"],
    ["plans", "aggregationReadiness"],
    ["startTime"],
    ["story"],
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
  const accepted =
    application &&
    (application.schemaVersion < 3
      ? application.previous && isPreviousSubmission(application.previous)
      : !Object.keys(validateApplication(application)).length);
  return {
    signedIn: saved?.signedIn === true,
    introSeen: saved?.introSeen === true,
    application: accepted ? application : null,
    draft: sanitizeApplication(saved?.draft),
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
