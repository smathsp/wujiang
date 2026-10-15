<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import {
  REGIONS,
  cityFromResult,
  locationLabel,
  validLocation,
} from "../location.js";
const model = defineModel({ type: Object, required: true });
defineProps({ invalid: Boolean });
const locating = ref(false);
const message = ref("");
const manualOpen = ref(false);
const province = ref("");
const city = ref("");
const cities = computed(() => REGIONS[province.value] || []);
const ready = computed(() =>
  validLocation({ province: province.value, city: city.value }),
);
let request = 0;
let controller;
function stopLocating() {
  request++;
  controller?.abort();
  locating.value = false;
}
function openManual() {
  stopLocating();
  province.value = model.value.province;
  city.value = model.value.city;
  manualOpen.value = true;
}
function changeProvince() {
  city.value = cities.value.length === 1 ? cities.value[0] : "";
}
function saveManual() {
  if (!ready.value) return;
  stopLocating();
  model.value = { province: province.value, city: city.value.trim() };
  manualOpen.value = false;
  message.value = "";
}
async function locate() {
  stopLocating();
  const id = request;
  message.value = "";
  manualOpen.value = false;
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
    province.value = model.value.province;
    city.value = model.value.city;
    manualOpen.value = true;
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
    <div v-if="manualOpen" class="city-editor">
      <label
        >省份 / 地区<select
          v-model="province"
          aria-label="省份或地区"
          @change="changeProvince"
        >
          <option disabled value="">请选择</option>
          <option v-for="(_, name) in REGIONS" :key="name" :value="name">
            {{ name }}
          </option>
        </select></label
      >
      <label
        >城市<select v-if="cities.length" v-model="city" aria-label="城市">
          <option disabled value="">请选择</option>
          <option v-for="item in cities" :key="item" :value="item">
            {{ item }}
          </option></select
        ><input
          v-else
          v-model="city"
          :disabled="!province"
          aria-label="城市"
          placeholder="填写城市"
          maxlength="30"
      /></label>
      <button
        type="button"
        class="city-confirm"
        :disabled="!ready"
        @click="saveManual"
      >
        确认城市
      </button>
      <button type="button" class="city-cancel" @click="manualOpen = false">
        取消
      </button>
    </div>
  </div>
  <p class="field-hint">
    给家人使用，可手动选择所在城市。定位会将位置发送至 BigDataCloud
    解析，表单仅保存省市。
  </p>
</template>
