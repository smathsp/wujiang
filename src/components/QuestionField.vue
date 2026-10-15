<script setup>
defineProps({
  name: String,
  title: String,
  index: String,
  hint: String,
  error: String,
  disabled: Boolean,
  sub: Boolean,
});
</script>
<template>
  <fieldset
    :class="sub ? 'follow-up' : 'question'"
    :data-field="name"
    :disabled="disabled"
  >
    <legend>
      <span v-if="index" class="question-index">{{ index }}</span
      >{{ title }}
    </legend>
    <p v-if="hint" class="field-hint question-hint">{{ hint }}</p>
    <slot />
    <p v-if="error" :id="`${name}-error`" class="field-error" role="alert">
      {{ error }}
    </p>
  </fieldset>
</template>
