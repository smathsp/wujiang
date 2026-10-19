<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
const model = defineModel({ type: String, default: "" });
defineProps({
  name: String,
  label: String,
  placeholder: String,
  invalid: Boolean,
  examples: { type: Array, default: () => [] },
});
const input = ref(null);
let observer;
let lastWidth = 0;
function resize() {
  if (!input.value) return;
  input.value.style.height = "auto";
  input.value.style.height = `${input.value.scrollHeight + 2}px`;
}
watch(model, () => nextTick(resize));
onMounted(() => {
  resize();
  observer = new ResizeObserver((entries) => {
    const width = entries[0].contentRect.width;
    if (width !== lastWidth) {
      lastWidth = width;
      resize();
    }
  });
  observer.observe(input.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div class="text-answer">
    <textarea
      ref="input"
      v-model="model"
      class="answer-textarea"
      :name="name"
      :aria-label="label"
      rows="3"
      :placeholder="placeholder"
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? `${name}-error` : undefined"
    ></textarea>
    <div class="answer-tools">
      <details v-if="examples.length" class="answer-example">
        <summary>看个例子</summary>
        <div class="example-copy">
          <p v-for="example in examples" :key="example">{{ example }}</p>
        </div>
      </details>
    </div>
  </div>
</template>
