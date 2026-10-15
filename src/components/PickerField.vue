<script setup>
defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, required: true },
  name: { type: String, required: true },
  invalid: Boolean,
  expanded: Boolean,
});
defineEmits(["open"]);
</script>

<template>
  <button
    type="button"
    class="picker-field"
    :class="{ filled: modelValue, invalid }"
    :aria-label="`${label}${modelValue ? `，当前${modelValue}` : ''}`"
    aria-haspopup="dialog"
    :aria-expanded="expanded"
    :aria-invalid="invalid || undefined"
    :aria-describedby="invalid ? `${name}-error` : undefined"
    @click="$emit('open', $event)"
  >
    <span>{{ modelValue || label }}</span
    ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
  </button>
</template>
