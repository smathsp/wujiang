<script setup>
import { computed, ref, watch } from "vue";
import { toggleChoice } from "../model.js";
defineOptions({ inheritAttrs: false });
const props = defineProps({
  modelValue: { type: [String, Array], required: true },
  options: { type: Array, required: true },
  labels: { type: Object, default: () => ({}) },
  name: { type: String, required: true },
  multiple: Boolean,
  max: { type: Number, default: Infinity },
  exclusive: { type: Array, default: () => [] },
  invalid: Boolean,
  errorId: { type: String, default: "" },
  compact: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const limitMessage = ref("");
const full = computed(
  () => props.multiple && props.modelValue.length >= props.max,
);
const selected = (option) =>
  props.multiple
    ? props.modelValue.includes(option)
    : props.modelValue === option;
const atLimit = (option) =>
  full.value && !selected(option) && !props.exclusive.includes(option);
watch(
  () => props.modelValue,
  () => {
    limitMessage.value = "";
  },
  { deep: true },
);
function update(option, event) {
  if (event.target.checked && atLimit(option)) {
    event.target.checked = false;
    limitMessage.value = `最多选 ${props.max} 项，请先取消一项。`;
    return;
  }
  limitMessage.value = "";
  emit(
    "update:modelValue",
    props.multiple
      ? toggleChoice(
          props.modelValue,
          option,
          event.target.checked,
          props.max,
          props.exclusive,
        )
      : option,
  );
}
</script>
<template>
  <div
    v-bind="$attrs"
    class="choices"
    :class="{ 'choices-invalid': invalid, 'choices-compact': compact }"
  >
    <label
      v-for="option in options"
      :key="option"
      class="choice"
      :class="{ selected: selected(option) }"
    >
      <input
        :type="multiple ? 'checkbox' : 'radio'"
        :name="name"
        :value="option"
        :checked="selected(option)"
        :aria-invalid="invalid || undefined"
        :aria-describedby="
          invalid
            ? errorId || `${name}-error`
            : limitMessage
              ? `${name}-limit`
              : undefined
        "
        @change="update(option, $event)"
      />
      <span>{{ labels[option] || option }}</span
      ><span class="choice-indicator" aria-hidden="true">{{
        selected(option) ? "✓" : ""
      }}</span>
    </label>
  </div>
  <p
    v-if="limitMessage"
    :id="`${name}-limit`"
    class="selection-limit"
    role="status"
  >
    {{ limitMessage }}
  </p>
</template>
