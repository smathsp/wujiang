<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import BottomSheet from "./components/BottomSheet.vue";
import RegistrationFields from "./components/RegistrationFields.vue";
import CityPicker from "./components/CityPicker.vue";
import { deviceAnswerLabel } from "./devices.js";
import {
  CORE_FIELDS,
  completedQuestions,
  persistState,
  prepareDraft,
  readState,
  sanitizeApplication,
  validateApplication,
} from "./model.js";

let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("Storage unavailable");
    },
  };
}
const cardArtwork = `${import.meta.env.BASE_URL}images/wujiang-card-reference.png`;
const state = reactive(readState(storage));
const editing = ref(false);
const busy = ref(false);
const activeSheet = ref(null);
const displaySheet = ref("intro");
const errors = ref({});
const notice = ref("");
const keyboardOpen = ref(false);
const submitButton = ref(null);
const view = computed(() =>
  !state.signedIn
    ? "login"
    : state.application && !editing.value
      ? "received"
      : "form",
);
watch(view, () => window.scrollTo({ top: 0, behavior: "instant" }), {
  flush: "post",
});
const savedProgress = computed(() => completedQuestions(state.draft));
const receivedDevice = computed(
  () =>
    deviceAnswerLabel(state.application) ||
    state.application.previous?.devices?.join("、") ||
    state.application.previous?.previous?.deviceModel ||
    state.application.previous?.previous?.device ||
    "待补充",
);
const receivedUsage = computed(() =>
  state.application.usageUnknown
    ? "暂时不清楚"
    : state.application.usage
      ? `${state.application.usage} GB / 月`
      : state.application.previous?.usage ||
        state.application.previous?.previous?.usage ||
        "待补充",
);
const sheetTitle = computed(() =>
  displaySheet.value === "city" ? "选择使用城市" : "无疆卡 · 5G 加油站",
);
const sheetToken = `wujiang-${Date.now()}`;
let sheetInHistory = false;
let historyClosing = false;
let queuedSheet = null;
let persistTimer;
let toastTimer;
let busyTimer;
let storageNoticeShown = false;

function saveNow() {
  clearTimeout(persistTimer);
  if (!persistState(state, storage) && !storageNoticeShown) {
    storageNoticeShown = true;
    toast("浏览器未允许保存草稿，请保持此页面打开。");
  }
}
watch(
  state,
  () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(saveNow, 200);
  },
  { deep: true },
);
watch(
  () => state.draft,
  () => {
    const currentErrors = validateApplication(state.draft);
    for (const key of Object.keys(errors.value))
      if (!currentErrors[key]) delete errors.value[key];
  },
  { deep: true },
);

function toast(text) {
  notice.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    notice.value = "";
  }, 2800);
}
function openSheet(type, addHistory = true) {
  if (busy.value || activeSheet.value) return;
  if (historyClosing) {
    queuedSheet = { type, addHistory };
    return;
  }
  displaySheet.value = type;
  activeSheet.value = type;
  if (addHistory) {
    history.pushState(
      { ...history.state, wujiangSheet: sheetToken },
      "",
      location.href,
    );
    sheetInHistory = true;
  }
}
function closeSheet(fromHistory = false) {
  if (!activeSheet.value) return;
  if (activeSheet.value === "intro") {
    state.introSeen = true;
    saveNow();
  }
  activeSheet.value = null;
  if (
    !fromHistory &&
    sheetInHistory &&
    history.state?.wujiangSheet === sheetToken
  ) {
    historyClosing = true;
    history.back();
  }
  sheetInHistory = false;
}
function onPopState() {
  historyClosing = false;
  if (activeSheet.value) closeSheet(true);
  if (queuedSheet) {
    const next = queuedSheet;
    queuedSheet = null;
    openSheet(next.type, next.addHistory);
  }
}
async function focusView() {
  await nextTick();
  if (
    document.activeElement?.matches('input, textarea, button, [role="radio"]')
  )
    return;
  document.querySelector("main h1")?.focus({ preventScroll: true });
}
function signIn() {
  if (busy.value) return;
  busy.value = true;
  // This visible pending state represents the future Youzan authorization round trip.
  busyTimer = setTimeout(() => {
    state.signedIn = true;
    busy.value = false;
    saveNow();
  }, 280);
}
function signOut() {
  state.signedIn = false;
  editing.value = false;
  errors.value = {};
  saveNow();
}
function editApplication() {
  state.draft = prepareDraft(state.application);
  editing.value = true;
  errors.value = {};
}
function cancelEdit() {
  state.draft = prepareDraft(state.application);
  editing.value = false;
  errors.value = {};
  saveNow();
}
async function submit() {
  if (busy.value) return;
  errors.value = validateApplication(state.draft);
  const firstKey = Object.keys(errors.value)[0];
  if (firstKey) {
    await nextTick();
    const wrapper = document.querySelector(`[data-field="${firstKey}"]`);
    const control =
      wrapper?.querySelector(
        'textarea[aria-invalid="true"], input[aria-invalid="true"]:not([type="radio"]):not([type="checkbox"]):not(:disabled)',
      ) ||
      wrapper?.querySelector(
        "input:not(:disabled), button:not(:disabled), textarea, select",
      );
    control?.focus({ preventScroll: true });
    const scrollTarget =
      wrapper?.getBoundingClientRect().height >
      (window.visualViewport?.height || window.innerHeight) * 0.7
        ? control
        : wrapper;
    scrollTarget?.scrollIntoView({
      behavior: "instant",
      block: "center",
    });
    return;
  }
  busy.value = true;
  await nextTick();
  busyTimer = setTimeout(() => {
    state.application = sanitizeApplication({
      ...state.draft,
      schemaVersion: 5,
    });
    state.draft = sanitizeApplication(state.application);
    state.updatedAt = new Date().toISOString();
    editing.value = false;
    busy.value = false;
    saveNow();
  }, 220);
}
function resizeViewport() {
  const viewport = window.visualViewport;
  document.documentElement.style.setProperty(
    "--visual-height",
    `${viewport?.height || window.innerHeight}px`,
  );
  document.documentElement.style.setProperty(
    "--visual-top",
    `${viewport?.offsetTop || 0}px`,
  );
  keyboardOpen.value = Boolean(
    window.visualViewport &&
      window.innerHeight - window.visualViewport.height > 140,
  );
  if (keyboardOpen.value && !activeSheet.value)
    nextTick(() => {
      const input = document.activeElement;
      if (
        !input?.matches(
          'main input:not([type="checkbox"]):not([type="radio"]), main textarea',
        )
      )
        return;
      const rect = input.getBoundingClientRect();
      const top = (viewport?.offsetTop || 0) + 12;
      const bottom =
        (viewport?.offsetTop || 0) +
        (viewport?.height || window.innerHeight) -
        18;
      if (rect.height < bottom - top && rect.bottom > bottom)
        window.scrollBy({ top: rect.bottom - bottom, behavior: "instant" });
    });
}
function onPageHide() {
  saveNow();
}
onMounted(() => {
  window.addEventListener("popstate", onPopState);
  window.addEventListener("pagehide", onPageHide);
  window.visualViewport?.addEventListener("resize", resizeViewport);
  window.visualViewport?.addEventListener("scroll", resizeViewport);
  window.addEventListener("resize", resizeViewport);
  resizeViewport();
  openSheet("intro", false);
});
onBeforeUnmount(() => {
  saveNow();
  clearTimeout(toastTimer);
  clearTimeout(busyTimer);
  window.removeEventListener("popstate", onPopState);
  window.removeEventListener("pagehide", onPageHide);
  window.visualViewport?.removeEventListener("resize", resizeViewport);
  window.visualViewport?.removeEventListener("scroll", resizeViewport);
  window.removeEventListener("resize", resizeViewport);
});
</script>

<template>
  <div class="app-shell" :inert="activeSheet !== null">
    <main>
      <Transition name="page" mode="out-in" @after-enter="focusView">
        <section v-if="view === 'login'" key="login" class="login-view">
          <div class="login-symbol" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M8 16h16m-6-6 6 6-6 6" /></svg>
          </div>
          <h1 class="page-heading" tabindex="-1">无疆卡首批报名</h1>
          <p class="page-hint">
            登录识别 Ultra 订单和灯牌等级，<br />填好表，等待首批结果。
          </p>
          <button
            class="primary-button"
            :disabled="busy"
            :aria-busy="busy"
            @click="signIn"
          >
            <span v-if="busy" class="spinner"></span
            >{{ busy ? "正在登录" : "有赞登录"
            }}<span v-if="!busy" class="button-arrow" aria-hidden="true"
              >↗</span
            >
          </button>
          <p class="login-note">演示登录，无需输入账号或密码</p>
          <button class="text-button" @click="openSheet('intro')">
            卡片介绍
          </button>
        </section>

        <section
          v-else-if="view === 'form'"
          key="form"
          class="form-view"
          :class="{ 'keyboard-open': keyboardOpen }"
        >
          <div class="form-heading">
            <h1 class="page-heading" tabindex="-1">
              {{ state.application ? "修改报名信息" : "无疆卡报名" }}
            </h1>
            <button
              class="text-button"
              :disabled="busy"
              @click="openSheet('intro')"
            >
              卡片介绍
            </button>
          </div>
          <div class="account-strip">
            <span class="account-chip">✓ Ultra 已购</span
            ><span class="account-chip">灯牌 12 级</span>
            <button class="logout" :disabled="busy" @click="signOut">
              退出
            </button>
          </div>
          <div class="form-progress" aria-live="polite">
            <span>按实际情况填写 · 全部必填 · 自动保存</span
            ><span>{{ savedProgress }} / {{ CORE_FIELDS.length }}</span>
            <div class="progress-track">
              <span
                :style="{
                  width: `${(savedProgress / CORE_FIELDS.length) * 100}%`,
                }"
              ></span>
            </div>
          </div>
          <form
            id="signup-form"
            novalidate
            :aria-busy="busy"
            @submit.prevent="submit"
          >
            <RegistrationFields
              v-model="state.draft"
              :errors="errors"
              :busy="busy"
              @open-city="openSheet('city')"
            />
            <div class="confirmation" data-field="feesAccepted">
              <label class="check-row"
                ><input
                  v-model="state.draft.feesAccepted"
                  :disabled="busy"
                  type="checkbox"
                  name="feesAccepted"
                  :aria-invalid="!!errors.feesAccepted || undefined"
                  :aria-describedby="
                    errors.feesAccepted ? 'feesAccepted-error' : undefined
                  "
                /><span
                  >我已了解：<b
                    >卡片免费，邮费 9.9
                    元，流量另行计费；无疆卡需先激活，才能发货。</b
                  ></span
                ></label
              >
              <p
                v-if="errors.feesAccepted"
                id="feesAccepted-error"
                class="field-error"
                role="alert"
              >
                {{ errors.feesAccepted }}
              </p>
            </div>
            <div class="form-disclaimer">
              报名后请等待结果，不代表已获得名额。
            </div>
          </form>
          <div class="submit-dock" :class="{ 'dock-keyboard': keyboardOpen }">
            <button
              ref="submitButton"
              class="primary-button"
              type="submit"
              form="signup-form"
              :disabled="busy"
              :aria-busy="busy"
            >
              <span v-if="busy" class="spinner"></span
              >{{
                busy ? "正在保存" : state.application ? "保存修改" : "提交报名"
              }}<span v-if="!busy" class="button-arrow" aria-hidden="true"
                >↗</span
              ></button
            ><button
              v-if="state.application"
              class="cancel-edit"
              :disabled="busy"
              @click="cancelEdit"
            >
              暂不修改</button
            ><span v-else class="dock-hint">Ultra 用户、灯牌等级优先参考</span>
          </div>
        </section>

        <section v-else key="received" class="received-view">
          <div class="received-symbol" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="m8 16 6 6L25 10" /></svg>
          </div>
          <h1 tabindex="-1">已收到，请等待。</h1>
          <p class="page-hint">报名信息已保存，<br />请等待首批结果通知。</p>
          <p class="shipping-note">无疆卡需先激活，才能发货。</p>
          <div class="received-info">
            <div class="received-row">
              <span>领取数量</span
              ><span>{{
                state.application.cardCount
                  ? `${state.application.cardCount} 张`
                  : "待补充"
              }}</span>
            </div>
            <div class="received-row">
              <span>使用对象</span
              ><span>{{
                (state.application.audience === "其他人" &&
                state.application.relationship
                  ? `其他人（${state.application.relationship}）`
                  : state.application.audience) ||
                state.application.previous?.audience ||
                "待补充"
              }}</span>
            </div>
            <div class="received-row">
              <span>设备</span><span>{{ receivedDevice }}</span>
            </div>
            <div class="received-row">
              <span>实际月用量</span><span>{{ receivedUsage }}</span>
            </div>
            <div class="received-row">
              <span>预计开始</span
              ><span>{{ state.application.startTime || "待补充" }}</span>
            </div>
          </div>
          <button class="secondary-button" @click="editApplication">
            修改报名信息</button
          ><button class="logout" @click="signOut">退出登录</button>
          <button class="text-button" @click="openSheet('intro')">
            卡片介绍
          </button>
        </section>
      </Transition>
    </main>
    <footer class="demo-note">前端演示 · 信息仅保存在此浏览器</footer>
  </div>

  <BottomSheet
    :open="!!activeSheet"
    :title="sheetTitle"
    :kind="displaySheet === 'intro' ? 'intro-sheet' : 'option-sheet'"
    @close="closeSheet()"
  >
    <template v-if="displaySheet === 'intro'">
      <div class="intro-content">
        <div class="intro-heading">
          <a
            class="intro-art"
            :href="cardArtwork"
            target="_blank"
            rel="noopener"
            aria-label="查看完整卡面大图（新窗口）"
          >
            <img
              :src="cardArtwork"
              alt="无疆卡黑金卡面"
              width="1254"
              height="1254"
              fetchpriority="high"
            />
            <span>查看大图 ↗</span>
          </a>
          <h2 id="sheet-title">无疆卡<span>5G 加油站</span></h2>
        </div>
        <div class="intro-body">
          <p class="intro-description">
            面向 CPE
            的联通物联网共享流量卡。像给车加油，按需购买流量，用多少付多少。
          </p>
          <p class="intro-scenarios">
            可供自己或家人上网，也可与天火卡搭配，用作备用网络。
          </p>
          <div class="fee-summary">
            <div><span>卡片</span><strong>免费领取</strong></div>
            <div><span>下单邮费</span><strong>¥9.9</strong></div>
          </div>
          <p class="activation-note">无疆卡需先激活，才能发货。</p>
          <p class="intro-terms">
            流量费用另计，不适合频繁测速和持续大流量下载。
          </p>
        </div>
      </div>
      <div class="intro-actions">
        <button class="primary-button" data-initial-focus @click="closeSheet()">
          {{ state.signedIn ? "知道了" : "知道了，去登录"
          }}<span class="button-arrow" aria-hidden="true">↗</span>
        </button>
      </div>
    </template>
    <CityPicker
      v-else-if="displaySheet === 'city'"
      :model-value="state.draft.location"
      @select="
        state.draft.location = $event;
        closeSheet();
      "
    />
  </BottomSheet>
  <Transition name="toast"
    ><div v-if="notice" class="toast" role="status">
      {{ notice }}
    </div></Transition
  >
</template>
