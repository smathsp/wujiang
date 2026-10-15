<script setup>
import { computed } from "vue";
const props = defineProps({
  modelValue: { type: [String, Array], required: true },
  options: { type: Array, required: true },
  name: { type: String, required: true },
  multiple: Boolean,
  max: { type: Number, default: 2 },
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
function update(option, checked) {
  if (!props.multiple) {
    emit("update:modelValue", option);
    return;
  }
  const next = props.modelValue.filter((value) => value !== option);
  if (checked && next.length < props.max) next.push(option);
  emit("update:modelValue", next);
}
</script>

<template>
  <div class="choices" :class="{ 'choices-invalid': invalid }">
    <label
      v-for="option in options"
      :key="option"
      class="choice"
      :class="{ selected: selected(option), muted: full && !selected(option) }"
    >
      <input
        :type="multiple ? 'checkbox' : 'radio'"
        :name="name"
        :value="option"
        :checked="selected(option)"
        :disabled="full && !selected(option)"
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
