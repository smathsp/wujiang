export const STORAGE_KEY = "wujiang.signup.v1";
export const OPTIONS = Object.freeze({
  audience: ["我自己", "父母或家人", "家庭多人共享", "暂时没想好"],
  device: [
    "Ultra，已经收到",
    "Ultra，等待发货",
    "其他 CPE 设备",
    "暂时没有设备",
  ],
  usage: [
    "50GB 以内",
    "51—100GB",
    "101—200GB",
    "201—300GB",
    "300GB 以上",
    "不清楚",
  ],
  plans: ["日常上网", "家庭共享", "备用网络", "搭配天火卡", "双网络聚合"],
});

export function blankApplication() {
  return {
    audience: "",
    device: "",
    deviceModel: "",
    usage: "",
    plans: [],
    story: "",
    feesAccepted: false,
    consent: false,
  };
}

export function sanitizeApplication(input) {
  const source = input && typeof input === "object" ? input : {};
  const clean = blankApplication();
  for (const key of ["audience", "device", "usage"]) {
    if (OPTIONS[key].includes(source[key])) clean[key] = source[key];
  }
  clean.deviceModel =
    clean.device === "其他 CPE 设备" && typeof source.deviceModel === "string"
      ? source.deviceModel.slice(0, 60)
      : "";
  clean.story =
    typeof source.story === "string" ? source.story.slice(0, 100) : "";
  clean.plans = Array.isArray(source.plans)
    ? [
        ...new Set(
          source.plans.filter((value) => OPTIONS.plans.includes(value)),
        ),
      ].slice(0, 2)
    : [];
  clean.feesAccepted = source.feesAccepted === true;
  clean.consent = source.consent === true;
  return clean;
}

export function validateApplication(value) {
  const errors = {};
  if (!OPTIONS.audience.includes(value.audience))
    errors.audience = "选一下主要给谁用";
  if (!OPTIONS.device.includes(value.device)) errors.device = "请选择设备";
  if (value.device === "其他 CPE 设备" && !value.deviceModel.trim())
    errors.deviceModel = "补充一下设备型号";
  if (!OPTIONS.usage.includes(value.usage))
    errors.usage = "选一下大致用量，不清楚也可以";
  if (!Array.isArray(value.plans) || !value.plans.length)
    errors.plans = "至少选择一种使用方式";
  else if (
    value.plans.length > 2 ||
    value.plans.some((plan) => !OPTIONS.plans.includes(plan))
  )
    errors.plans = "请选择最多两种使用方式";
  if (!value.feesAccepted) errors.feesAccepted = "请先确认领取和计费说明";
  return errors;
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
      application && !Object.keys(validateApplication(application)).length
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
