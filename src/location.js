import source from "./data/cities.json" with { type: "json" };

export const REGIONS = Object.freeze({
  ...source,
  北京市: ["北京市"],
  天津市: ["天津市"],
  上海市: ["上海市"],
  重庆市: ["重庆市"],
  台湾省: [],
  香港特别行政区: ["香港"],
  澳门特别行政区: ["澳门"],
  其他地区: [],
});
export function validLocation(value) {
  return Boolean(
    value &&
      Object.hasOwn(REGIONS, value.province) &&
      typeof value.city === "string" &&
      value.city.trim() &&
      value.city.length <= 30 &&
      (!REGIONS[value.province].length ||
        REGIONS[value.province].includes(value.city)),
  );
}
const normalize = (name) =>
  String(name || "").replace(
    /(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市)$/u,
    "",
  );
export function cityFromResult(result) {
  const names = (result?.localityInfo?.administrative || []).map(
    (item) => item.name,
  );
  const province = Object.keys(REGIONS).find((name) =>
    [result?.principalSubdivision, ...names].some(
      (candidate) => normalize(candidate) === normalize(name),
    ),
  );
  if (!province) return null;
  const cities = REGIONS[province];
  const candidates = [result.city, ...names];
  const city =
    cities.length === 1
      ? cities[0]
      : cities.find((name) =>
          candidates.some(
            (candidate) => normalize(candidate) === normalize(name),
          ),
        );
  return city ? { province, city } : null;
}
export function locationLabel(value) {
  if (!validLocation(value)) return "尚未选择城市";
  return value.province === value.city
    ? value.city
    : `${value.province} · ${value.city}`;
}

// Search is local; typed city names never leave the browser.
const CITY_ENTRIES = Object.entries(REGIONS).flatMap(([province, cities]) =>
  cities.map((city) => ({ province, city })),
);
export function searchCities(query) {
  const words = String(query || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];
  return CITY_ENTRIES.filter((item) =>
    words.every((word) => `${item.province}${item.city}`.includes(word)),
  );
}
