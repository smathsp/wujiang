<script setup>
import { computed, ref } from "vue";
import { REGIONS, searchCities, validLocation } from "../location.js";
const props = defineProps({ modelValue: { type: Object, required: true } });
const emit = defineEmits(["select"]);
const query = ref("");
const province = ref("");
const customCity = ref("");
const results = computed(() => searchCities(query.value));
const provinces = Object.keys(REGIONS);
const cities = computed(() => REGIONS[province.value] || []);
const canSaveCustom = computed(() =>
  validLocation({ province: province.value, city: customCity.value.trim() }),
);
function chooseProvince(value) {
  province.value = value;
  customCity.value =
    value === props.modelValue.province ? props.modelValue.city : "";
}
function chooseCity(value) {
  emit("select", value);
}
</script>
<template>
  <div class="city-picker">
    <h2 id="sheet-title">选择使用城市</h2>
    <div class="city-search">
      <span aria-hidden="true">⌕</span
      ><input
        v-model="query"
        type="search"
        aria-label="搜索城市或省份"
        placeholder="搜索城市或省份，如杭州"
        autocomplete="off"
        enterkeyhint="search"
      /><button
        v-if="query"
        type="button"
        aria-label="清除搜索"
        @click="query = ''"
      >
        ×
      </button>
    </div>
    <div v-if="query.trim()" class="city-results">
      <p class="picker-hint" role="status">
        {{
          results.length
            ? `找到 ${results.length} 个城市`
            : "没有找到，试试城市中文名，或按省份选择。"
        }}
      </p>
      <button
        v-if="!results.length"
        type="button"
        class="city-back"
        @click="
          query = '';
          province = '';
        "
      >
        按省份选择
      </button>
      <div class="city-list" aria-label="城市搜索结果">
        <button
          v-for="item in results"
          :key="`${item.province}-${item.city}`"
          type="button"
          class="city-option"
          @click="chooseCity(item)"
        >
          <span
            >{{ item.city }}<small>{{ item.province }}</small></span
          ><span aria-hidden="true">{{
            modelValue.province === item.province &&
            modelValue.city === item.city
              ? "✓"
              : "›"
          }}</span>
        </button>
      </div>
    </div>
    <template v-else-if="province">
      <button type="button" class="city-back" @click="province = ''">
        ‹ 返回省份 <span>{{ province }}</span>
      </button>
      <div
        v-if="cities.length"
        class="city-list"
        :aria-label="`${province}城市列表`"
      >
        <button
          v-for="city in cities"
          :key="city"
          type="button"
          class="city-option"
          @click="chooseCity({ province, city })"
        >
          <span>{{ city }}</span
          ><span aria-hidden="true">{{
            modelValue.province === province && modelValue.city === city
              ? "✓"
              : "›"
          }}</span>
        </button>
      </div>
      <div v-else class="custom-city">
        <label for="custom-city">城市名称</label
        ><input
          id="custom-city"
          v-model="customCity"
          class="field-input"
          aria-label="填写城市名称"
          placeholder="填写实际使用城市"
          maxlength="30"
        /><button
          type="button"
          class="primary-button"
          :disabled="!canSaveCustom"
          @click="chooseCity({ province, city: customCity.trim() })"
        >
          确认城市
        </button>
      </div>
    </template>
    <template v-else
      ><p class="picker-hint">也可以先选择省份</p>
      <div class="city-list province-list" aria-label="省份列表">
        <button
          v-for="item in provinces"
          :key="item"
          type="button"
          class="city-option"
          @click="chooseProvince(item)"
        >
          {{ item }}<span aria-hidden="true">›</span>
        </button>
      </div></template
    >
  </div>
</template>
