<script setup>
import { computed } from "vue";
import { toggleChoice } from "../model.js";
const props = defineProps({
  modelValue: { type: [String, Array], required: true },
  options: { type: Array, required: true },
  name: { type: String, required: true },
  multiple: Boolean,
  max: { type: Number, default: Infinity },
  exclusive: { type: Array, default: () => [] },
  invalid: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const full = computed(
  () => props.multiple && props.modelValue.length >= props.max,
);
const selected = (option) =>
  props.multiple
    ? props.modelValue.includes(option)
    : props.modelValue === option;
const disabled = (option) =>
  full.value && !selected(option) && !props.exclusive.includes(option);
function update(option, checked) {
  emit(
    "update:modelValue",
    props.multiple
      ? toggleChoice(
          props.modelValue,
          option,
          checked,
          props.max,
          props.exclusive,
        )
      : option,
  );
}
</script>
<template>
  <div class="choices" :class="{ 'choices-invalid': invalid }">
    <label
      v-for="option in options"
      :key="option"
      class="choice"
      :class="{ selected: selected(option), muted: disabled(option) }"
    >
      <input
        :type="multiple ? 'checkbox' : 'radio'"
        :name="name"
        :value="option"
        :checked="selected(option)"
        :disabled="disabled(option)"
        :aria-invalid="invalid || undefined"
        :aria-describedby="invalid ? `${name}-error` : undefined"
        @change="update(option, $event.target.checked)"
      />
      <span>{{ option }}</span
      ><span class="choice-indicator" aria-hidden="true">{{
        selected(option) ? "✓" : ""
      }}</span>
    </label>
  </div>
</template>
