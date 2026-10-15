<script setup>
import { onBeforeUnmount, ref } from "vue";
import { cityFromResult, locationLabel, validLocation } from "../location.js";
const model = defineModel({ type: Object, required: true });
defineProps({ invalid: Boolean });
const emit = defineEmits(["open-city"]);
const locating = ref(false);
const message = ref("");
let request = 0;
let controller;
function stopLocating() {
  request++;
  controller?.abort();
  locating.value = false;
}
function openManual() {
  stopLocating();
  message.value = "";
  emit("open-city");
}
async function locate() {
  stopLocating();
  const id = request;
  message.value = "";
  locating.value = true;
  try {
    if (!navigator.geolocation || !window.isSecureContext)
      throw new Error("unavailable");
    const position = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      }),
    );
    if (id !== request) return;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 6000);
    let result;
    try {
      const query = new URLSearchParams({
        latitude: String(position.coords.latitude),
        longitude: String(position.coords.longitude),
        localityLanguage: "zh",
      });
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`,
        {
          signal: controller.signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
        },
      );
      if (!response.ok) throw new Error("lookup");
      result = cityFromResult(await response.json());
    } finally {
      clearTimeout(timeout);
    }
    if (id !== request) return;
    if (!result) throw new Error("unmatched");
    model.value = result;
    message.value = "已定位，请确认是否为实际使用城市。";
  } catch (error) {
    if (id !== request) return;
    message.value =
      error.code === 1
        ? "未获得定位权限，请手动选择城市。"
        : "暂时无法定位，请手动选择城市。";
  } finally {
    if (id === request) locating.value = false;
  }
}
onBeforeUnmount(stopLocating);
</script>
<template>
  <div class="location-card" :class="{ invalid, filled: validLocation(model) }">
    <div class="location-heading">
      <span class="location-icon" aria-hidden="true"
        ><svg viewBox="0 0 24 24">
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.5" /></svg
      ></span>
      <div>
        <span class="location-caption">无疆卡的主要使用地</span
        ><strong>{{ locationLabel(model) }}</strong>
      </div>
    </div>
    <div class="location-actions">
      <button
        type="button"
        :disabled="locating"
        :aria-busy="locating"
        @click="locate"
      >
        <span aria-hidden="true">⌖</span
        >{{ locating ? "正在定位…" : "定位当前城市" }}
      </button>
      <button type="button" @click="openManual">
        {{ validLocation(model) ? "修改城市" : "手动选择"
        }}<span aria-hidden="true">›</span>
      </button>
    </div>
    <p v-if="message" class="field-hint location-status" role="status">
      {{ message }}
    </p>
  </div>
  <p class="field-hint">可定位或手动选择城市。</p>
</template>
