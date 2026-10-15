<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  kind: { type: String, default: "" },
});
const emit = defineEmits(["close"]);
const panel = ref(null);
let previousFocus;
let savedOverflow = "";
let savedPadding = "";
let locked = false;
let focusEpoch = 0;
function unlock() {
  if (!locked) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPadding;
  locked = false;
}
function keydown(event) {
  if (!props.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  }
  if (event.key !== "Tab") return;
  const items = [
    ...(panel.value?.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
    ) || []),
  ];
  if (!items.length) {
    event.preventDefault();
    panel.value?.focus();
    return;
  }
  const first = items[0],
    last = items.at(-1);
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
watch(
  () => props.open,
  async (open) => {
    const epoch = ++focusEpoch;
    if (open) {
      previousFocus = document.activeElement;
      savedOverflow = document.body.style.overflow;
      savedPadding = document.body.style.paddingRight;
      const scrollbar =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
      locked = true;
      document.addEventListener("keydown", keydown);
      await nextTick();
      if (props.open && epoch === focusEpoch)
        (
          panel.value?.querySelector("[data-initial-focus]") || panel.value
        )?.focus({ preventScroll: true });
    } else {
      document.removeEventListener("keydown", keydown);
      unlock();
      await nextTick();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  document.removeEventListener("keydown", keydown);
  unlock();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-backdrop" @click.self="$emit('close')">
        <section
          ref="panel"
          class="bottom-sheet"
          :class="kind"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          tabindex="-1"
        >
          <div class="sheet-handle" aria-hidden="true"></div>
          <button
            class="sheet-close"
            type="button"
            aria-label="关闭弹窗"
            @click="$emit('close')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
