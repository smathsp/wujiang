<script setup>
import { reactive, watch } from "vue";
import ChoiceGroup from "./ChoiceGroup.vue";
import QuestionField from "./QuestionField.vue";
import { DEVICE_GROUPS, DEVICE_STANDALONE } from "../devices.js";
const draft = defineModel({ type: Object, required: true });
const props = defineProps({ errors: { type: Object, default: () => ({}) } });
const selected = (group) =>
  group.options.filter((option) => draft.value.device.includes(option));
const expanded = reactive(
  Object.fromEntries(
    DEVICE_GROUPS.map((group, index) => [
      group.id,
      selected(group).length > 0 || (index === 0 && !draft.value.device.length),
    ]),
  ),
);
function selectGroup(group, options) {
  draft.value.device = [
    ...draft.value.device.filter((option) => !group.options.includes(option)),
    ...options,
  ];
}
watch(
  () => props.errors,
  (errors) => {
    for (const group of DEVICE_GROUPS)
      if (errors[group.otherField]) expanded[group.id] = true;
  },
  { deep: true },
);
</script>

<template>
  <div class="device-picker">
    <details
      v-for="group in DEVICE_GROUPS"
      :key="group.id"
      class="device-series"
      :open="expanded[group.id]"
      @toggle="expanded[group.id] = $event.target.open"
    >
      <summary>
        <span class="device-series-title">{{ group.title }}</span>
        <span class="device-series-selection">{{
          selected(group).length
            ? selected(group)
                .map((option) => group.labels[option] || option)
                .join("、")
            : "选择型号"
        }}</span>
        <span class="device-series-arrow" aria-hidden="true">⌄</span>
      </summary>
      <div class="device-series-body" role="group" :aria-label="group.title">
        <ChoiceGroup
          :model-value="selected(group)"
          :name="`device-${group.id}`"
          :options="group.options"
          :labels="group.labels"
          multiple
          compact
          :invalid="!!errors.device"
          error-id="device-error"
          @update:model-value="selectGroup(group, $event)"
        />
        <QuestionField
          v-if="draft.device.includes(group.options.at(-1))"
          sub
          :name="group.otherField"
          :title="`${group.title}的其他型号`"
          :error="errors[group.otherField]"
          class="device-other-field"
        >
          <input
            v-model="draft[group.otherField]"
            class="field-input"
            :name="group.otherField"
            :aria-label="`${group.title}的其他型号`"
            placeholder="填写具体型号"
            maxlength="80"
            :aria-invalid="!!errors[group.otherField] || undefined"
            :aria-describedby="
              errors[group.otherField] ? `${group.otherField}-error` : undefined
            "
          />
        </QuestionField>
      </div>
    </details>
    <ChoiceGroup
      :model-value="
        draft.device.filter((option) => DEVICE_STANDALONE.includes(option))
      "
      name="device-standalone"
      :options="DEVICE_STANDALONE"
      multiple
      :invalid="!!errors.device"
      error-id="device-error"
      @update:model-value="selectGroup({ options: DEVICE_STANDALONE }, $event)"
    />
    <QuestionField
      v-if="draft.device.includes('其他')"
      sub
      name="deviceModel"
      title="其他设备的品牌或型号"
      :error="errors.deviceModel"
      class="device-other-field"
    >
      <input
        v-model="draft.deviceModel"
        class="field-input"
        name="deviceModel"
        aria-label="其他设备的品牌或型号"
        placeholder="填写品牌或型号，可填写多个"
        maxlength="80"
        :aria-invalid="!!errors.deviceModel || undefined"
        :aria-describedby="errors.deviceModel ? 'deviceModel-error' : undefined"
      />
    </QuestionField>
  </div>
</template>
