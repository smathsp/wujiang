export const DEVICE_GROUPS = [
  {
    id: "c2000",
    title: "C2000 系列",
    options: [
      "C2000 Ultra",
      "C2000 Max",
      "C2000 Plus",
      "C2000 Pro+",
      "C2000 Pro",
      "C2000 其他",
    ],
    labels: {
      "C2000 Ultra": "Ultra",
      "C2000 Max": "Max",
      "C2000 Plus": "Plus",
      "C2000 Pro+": "Pro+",
      "C2000 Pro": "Pro",
      "C2000 其他": "其他",
    },
    otherField: "deviceOtherC2000",
  },
  {
    id: "ak68",
    title: "AK-68 系列",
    options: ["AK-68 798", "AK-68 788", "AK-68 其他"],
    labels: { "AK-68 其他": "其他" },
    otherField: "deviceOtherAK68",
  },
  {
    id: "c8",
    title: "C8 系列",
    options: ["C8-788", "C8-688", "C8-668", "C8 其他"],
    labels: { "C8 其他": "其他" },
    otherField: "deviceOtherC8",
  },
];
export const DEVICE_STANDALONE = ["NBCPE", "其他"];
export const DEVICE_OPTIONS = [
  ...DEVICE_GROUPS.flatMap((group) => group.options),
  ...DEVICE_STANDALONE,
];
export const DEVICE_OTHER_FIELDS = [
  ...DEVICE_GROUPS.map((group) => ({
    option: group.options.at(-1),
    field: group.otherField,
    title: `${group.title}的其他型号`,
  })),
  { option: "其他", field: "deviceModel", title: "其他设备的品牌或型号" },
];
const boundedText = (value) =>
  typeof value === "string" ? value.slice(0, 80) : "";

// Preserve exact old model names; do not guess which new model an ambiguous name means.
export function sanitizeDevices(value, preserveDraftText = false) {
  const raw =
    typeof value.device === "string"
      ? [value.device]
      : Array.isArray(value.device)
        ? value.device
        : [];
  let selected = raw
    .map((item) => (item === "Ultra" ? "C2000 Ultra" : item))
    .filter((item) => DEVICE_OPTIONS.includes(item));
  let other = boundedText(value.deviceModel);
  if (raw.includes("暂未确定设备")) {
    selected = ["其他"];
    other = "暂未确定设备";
  } else if (raw.includes("其他 CPE")) {
    const names = other
      .split(/[、，,；;\n]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    const unrecognized = [];
    for (const name of names) {
      const normalized = name.replace(/^AK-?68[ -]?(788|798)$/i, "AK-68 $1");
      if (
        DEVICE_OPTIONS.includes(normalized) &&
        !DEVICE_OTHER_FIELDS.some((item) => item.option === normalized)
      )
        selected.push(normalized);
      else unrecognized.push(name);
    }
    if (unrecognized.length || !names.length) selected.push("其他");
    other = unrecognized.join("、");
  }
  const answer = {
    device: DEVICE_OPTIONS.filter((option) => selected.includes(option)),
  };
  for (const { option, field } of DEVICE_OTHER_FIELDS)
    answer[field] =
      preserveDraftText || answer.device.includes(option)
        ? field === "deviceModel"
          ? other
          : boundedText(value[field])
        : "";
  return answer;
}

export function deviceAnswerLabel(value) {
  return value.device
    .map((option) => {
      const other = DEVICE_OTHER_FIELDS.find((item) => item.option === option);
      if (!other || !value[other.field]) return option;
      return option === "其他"
        ? value[other.field]
        : `${option.replace(" 其他", "")}（${value[other.field]}）`;
    })
    .join("、");
}
