export const STORAGE_KEY = "wujiang.signup.v1";
export const OPTIONS = Object.freeze({
  device: [
    "Ultra",
    "C2000 系列",
    "C8 系列",
    "AK68 系列",
    "其他 CPE 设备",
    "暂时没有设备",
  ],
  scenario: [
    "日常上网",
    "游戏 / 视频会议",
    "家庭共享",
    "出差 / 移动使用",
    "备用 / 双卡搭配",
    "其他场景",
  ],
  usage: [
    "50GB 以内",
    "51—100GB",
    "101—200GB",
    "201—300GB",
    "300GB 以上",
    "不清楚",
  ],
  networkProblem: [
    "套餐用不完仍要交月费",
    "流量经常不够用",
    "网络卡顿或掉线",
    "游戏 / 会议延迟高",
    "家人分别买套餐太麻烦",
    "闲置设备缺合适套餐",
    "暂无明显问题",
    "其他问题",
  ],
});
const LEGACY_AUDIENCE = ["我自己", "父母或家人", "家庭多人共享", "暂时没想好"];
const LEGACY_PLANS = [
  "日常上网",
  "家庭共享",
  "备用网络",
  "搭配天火卡",
  "双网络聚合",
];
const DEVICE_ALIASES = {
  "Ultra，已经收到": "Ultra",
  "Ultra，等待发货": "Ultra",
};

export function deviceNeedsModel(value) {
  return ["C2000 系列", "C8 系列", "AK68 系列", "其他 CPE 设备"].includes(
    value,
  );
}
export function blankApplication() {
  return {
    schemaVersion: 2,
    device: "",
    deviceModel: "",
    scenario: "",
    scenarioOther: "",
    usage: "",
    networkProblem: "",
    networkProblemOther: "",
    story: "",
    feesAccepted: false,
    consent: false,
    audience: "",
    plans: [],
  };
}
export function sanitizeApplication(input) {
  const source = input && typeof input === "object" ? input : {};
  const clean = blankApplication();
  clean.schemaVersion =
    source.schemaVersion === 2 ||
    (!("audience" in source) && !("plans" in source))
      ? 2
      : 1;
  for (const key of ["device", "scenario", "usage", "networkProblem"]) {
    const value =
      key === "device"
        ? DEVICE_ALIASES[source[key]] || source[key]
        : source[key];
    if (OPTIONS[key].includes(value)) clean[key] = value;
  }
  clean.deviceModel =
    deviceNeedsModel(clean.device) && typeof source.deviceModel === "string"
      ? source.deviceModel.slice(0, 60)
      : "";
  clean.scenarioOther =
    clean.scenario === "其他场景" && typeof source.scenarioOther === "string"
      ? source.scenarioOther.slice(0, 60)
      : "";
  clean.networkProblemOther =
    clean.networkProblem === "其他问题" &&
    typeof source.networkProblemOther === "string"
      ? source.networkProblemOther.slice(0, 80)
      : "";
  clean.story =
    typeof source.story === "string" ? source.story.slice(0, 150) : "";
  clean.feesAccepted = source.feesAccepted === true;
  clean.consent = source.consent === true;
  // Preserve earlier answers as history. Do not invent answers to new questions.
  clean.audience = LEGACY_AUDIENCE.includes(source.audience)
    ? source.audience
    : "";
  clean.plans = Array.isArray(source.plans)
    ? [
        ...new Set(
          source.plans.filter((value) => LEGACY_PLANS.includes(value)),
        ),
      ].slice(0, 2)
    : [];
  return clean;
}
export function validateApplication(value) {
  const errors = {};
  if (!OPTIONS.device.includes(value.device))
    errors.device = "请选择准备使用的设备";
  if (deviceNeedsModel(value.device) && !value.deviceModel.trim())
    errors.deviceModel = "补充一下具体型号";
  if (!OPTIONS.scenario.includes(value.scenario))
    errors.scenario = "请选择主要使用场景";
  if (value.scenario === "其他场景" && !value.scenarioOther.trim())
    errors.scenarioOther = "简单说说你的使用场景";
  if (!OPTIONS.usage.includes(value.usage))
    errors.usage = "请选择实际月用量，不清楚也可以";
  if (!OPTIONS.networkProblem.includes(value.networkProblem))
    errors.networkProblem = "请选择目前最困扰你的网络问题";
  if (value.networkProblem === "其他问题" && !value.networkProblemOther.trim())
    errors.networkProblemOther = "简单说说你遇到的问题";
  if (!value.story.trim()) errors.story = "说说无疆卡最能帮你解决的具体问题";
  if (!value.feesAccepted) errors.feesAccepted = "请先确认领取和计费说明";
  return errors;
}
function validLegacyApplication(value) {
  return (
    value.schemaVersion === 1 &&
    LEGACY_AUDIENCE.includes(value.audience) &&
    value.plans.length > 0 &&
    OPTIONS.device.includes(value.device) &&
    (!deviceNeedsModel(value.device) || !!value.deviceModel.trim()) &&
    OPTIONS.usage.includes(value.usage) &&
    value.feesAccepted
  );
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
  return {
    signedIn: saved?.signedIn === true,
    introSeen: saved?.introSeen === true,
    application:
      application &&
      (!Object.keys(validateApplication(application)).length ||
        validLegacyApplication(application))
        ? application
        : null,
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
