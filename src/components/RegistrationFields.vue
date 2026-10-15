<script setup>
import { computed, watch } from "vue";
import ChoiceGroup from "./ChoiceGroup.vue";
import PickerField from "./PickerField.vue";
import QuestionField from "./QuestionField.vue";
import {
  OPTIONS,
  EXCLUSIVE,
  LIMITS,
  FAMILY_AUDIENCES,
  HEAVY_HABITS,
  deviceNeedsModel,
} from "../model.js";
const draft = defineModel({ type: Object, required: true });
defineProps({
  errors: { type: Object, default: () => ({}) },
  busy: Boolean,
  activeSheet: String,
});
defineEmits(["open-picker"]);
const questions = [
  { key: "audience", title: "这张卡，主要准备给谁用？" },
  {
    key: "devices",
    title: "准备把卡用在哪些设备上？",
    hint: "可多选，按你现在的设备情况填写。",
    multiple: true,
  },
  {
    key: "usage",
    title: "这些人和设备，每月实际用多少流量？",
    hint: "参考最近一个月；家庭共享算合计，不清楚也可以。",
    picker: true,
  },
  {
    key: "problems",
    title: "现在最想解决哪些上网问题？",
    hint: "选最在意的 1—2 项。",
    multiple: true,
    wide: true,
  },
  { key: "unicomExperience", title: "使用地的联通网络，体验怎么样？" },
  {
    key: "habits",
    title: "平时主要怎样使用流量？",
    hint: "可多选，如实选择平时的习惯。",
    multiple: true,
  },
  {
    key: "plans",
    title: "最想怎样搭配使用无疆卡？",
    hint: "选最想尝试的 1—2 种。",
    multiple: true,
  },
  { key: "startTime", title: "拿到卡后，预计什么时候开始用？" },
  {
    key: "story",
    title: "说一个你想用无疆卡的真实场景。",
    hint: "谁在用、现在什么麻烦、想怎么解决。几句话就好。",
    text: true,
  },
];
const heavyUsage = computed(() =>
  draft.value.habits.some((value) => HEAVY_HABITS.includes(value)),
);
watch(
  () => draft.value.audience,
  (value) => {
    if (!FAMILY_AUDIENCES.includes(value)) draft.value.sharedCount = "";
  },
);
watch(
  () => [...draft.value.devices],
  (value) => {
    if (!deviceNeedsModel(value)) draft.value.deviceModel = "";
    if (!value.includes("家里闲置的 CPE")) draft.value.idleCount = "";
  },
);
watch(
  () => [...draft.value.problems],
  (value) => {
    if (!value.includes("其他问题")) draft.value.problemOther = "";
  },
);
watch(
  () => [...draft.value.plans],
  (value) => {
    if (!value.includes("双网络分流或聚合"))
      draft.value.aggregationReadiness = "";
  },
);
watch(
  () => [...draft.value.liveQuestions],
  (value) => {
    if (!value.includes("其他问题")) draft.value.liveQuestionOther = "";
  },
);
</script>
<template>
  <QuestionField
    v-for="(question, index) in questions"
    :key="question.key"
    :name="question.key"
    :title="question.title"
    :index="String(index + 1).padStart(2, '0')"
    :hint="question.hint"
    :error="errors[question.key]"
    :disabled="busy"
  >
    <PickerField
      v-if="question.picker"
      :model-value="draft.usage"
      name="usage"
      label="选择实际月用量"
      :invalid="!!errors.usage"
      :expanded="activeSheet === 'usage'"
      @open="$emit('open-picker', 'usage')"
    />
    <template v-else-if="question.text">
      <textarea
        id="story"
        v-model="draft.story"
        aria-label="真实使用场景"
        maxlength="150"
        rows="4"
        placeholder="比如：爸妈用量不多，家里两台 CPE 闲着，想共享一份流量，偶尔用时再付费。"
        :aria-invalid="!!errors.story || undefined"
        :aria-describedby="errors.story ? 'story-error' : undefined"
      ></textarea>
      <div class="character-count">{{ draft.story.length }} / 150</div>
    </template>
    <ChoiceGroup
      v-else
      v-model="draft[question.key]"
      :name="question.key"
      :options="OPTIONS[question.key]"
      :multiple="question.multiple"
      :max="LIMITS[question.key]"
      :exclusive="EXCLUSIVE[question.key]"
      :invalid="!!errors[question.key]"
      :class="{ 'choices-wide': question.wide }"
    />
    <p
      v-if="
        ['problems', 'plans'].includes(question.key) &&
        draft[question.key].length
      "
      class="selection-count"
      aria-live="polite"
    >
      已选 {{ draft[question.key].length }} / 2{{
        draft[question.key].length === 2 ? "，可取消后重选" : ""
      }}
    </p>
    <p
      v-if="
        question.key === 'devices' &&
        !draft.devices.length &&
        draft.previous?.device
      "
      class="previous-answer"
    >
      上次填写：{{
        draft.previous.deviceModel || draft.previous.device
      }}，请补充现在的设备情况。
    </p>
    <p
      v-if="question.key === 'usage' && !draft.usage && draft.previous?.usage"
      class="previous-answer"
    >
      上次填写：{{ draft.previous.usage }}，请按新的区间重新选择。
    </p>
    <Transition name="expand">
      <div
        v-if="
          question.key === 'audience' &&
          FAMILY_AUDIENCES.includes(draft.audience)
        "
        class="conditional follow-up-wrap"
      >
        <QuestionField
          sub
          name="sharedCount"
          title="包含你自己，预计有几人共享？"
          :error="errors.sharedCount"
        >
          <ChoiceGroup
            v-model="draft.sharedCount"
            name="sharedCount"
            :options="OPTIONS.sharedCount"
            :invalid="!!errors.sharedCount"
          />
        </QuestionField>
      </div>
    </Transition>
    <Transition name="expand">
      <div
        v-if="question.key === 'devices' && deviceNeedsModel(draft.devices)"
        class="conditional follow-up-wrap"
      >
        <QuestionField
          sub
          name="deviceModel"
          title="其他或闲置 CPE 的具体型号"
          hint="多台可分开写，用于核对适配性。"
          :error="errors.deviceModel"
        >
          <input
            v-model="draft.deviceModel"
            class="field-input"
            name="deviceModel"
            aria-label="具体设备型号"
            placeholder="如 C2000 Pro、AK68"
            maxlength="80"
            :aria-invalid="!!errors.deviceModel || undefined"
            :aria-describedby="
              errors.deviceModel ? 'deviceModel-error' : undefined
            "
          />
        </QuestionField>
        <QuestionField
          v-if="draft.devices.includes('家里闲置的 CPE')"
          sub
          name="idleCount"
          title="家里现在有几台闲置 CPE？"
          :error="errors.idleCount"
        >
          <ChoiceGroup
            v-model="draft.idleCount"
            name="idleCount"
            :options="OPTIONS.idleCount"
            :invalid="!!errors.idleCount"
          />
        </QuestionField>
      </div>
    </Transition>
    <Transition name="expand">
      <div
        v-if="
          question.key === 'problems' && draft.problems.includes('其他问题')
        "
        class="conditional"
        data-field="problemOther"
      >
        <input
          v-model="draft.problemOther"
          class="field-input"
          name="problemOther"
          aria-label="其他网络问题"
          placeholder="简单说说你遇到的问题"
          maxlength="80"
          :aria-invalid="!!errors.problemOther || undefined"
          :aria-describedby="
            errors.problemOther ? 'problemOther-error' : undefined
          "
        />
        <p
          v-if="errors.problemOther"
          id="problemOther-error"
          class="field-error"
          role="alert"
        >
          {{ errors.problemOther }}
        </p>
      </div>
    </Transition>
    <div v-if="question.key === 'unicomExperience'" class="conditional">
      <input
        v-model="draft.city"
        class="field-input"
        aria-label="使用地省市（选填）"
        placeholder="所在省市（选填，如浙江杭州）"
        maxlength="30"
        autocomplete="address-level2"
      />
    </div>
    <Transition name="expand"
      ><p
        v-if="question.key === 'habits' && heavyUsage"
        class="usage-warning"
        role="status"
      >
        无疆卡按流量计费。高清视频、频繁测速、大文件下载或持续传输都会增加费用，请结合正式单价和用量判断是否适合。
      </p></Transition
    >
    <Transition name="expand">
      <div
        v-if="
          question.key === 'plans' && draft.plans.includes('双网络分流或聚合')
        "
        class="conditional follow-up-wrap"
      >
        <QuestionField
          sub
          name="aggregationReadiness"
          title="设备和经验准备得怎么样？"
          hint="具体设备支持和玩法，以正式规则为准。"
          :error="errors.aggregationReadiness"
        >
          <ChoiceGroup
            v-model="draft.aggregationReadiness"
            name="aggregationReadiness"
            :options="OPTIONS.aggregationReadiness"
            :invalid="!!errors.aggregationReadiness"
          />
        </QuestionField>
      </div>
    </Transition>
  </QuestionField>
  <details class="optional-section">
    <summary>
      <span>再补充两项<span class="optional">选填</span></span
      ><span class="details-arrow" aria-hidden="true">＋</span>
    </summary>
    <div class="optional-body">
      <QuestionField
        name="monthlyCost"
        title="这些设备，每月流量费用大约多少？"
        hint="填当前实际花费，不用上传账单。"
        :disabled="busy"
      >
        <ChoiceGroup
          v-model="draft.monthlyCost"
          name="monthlyCost"
          :options="OPTIONS.monthlyCost"
        />
        <button
          v-if="draft.monthlyCost"
          type="button"
          class="clear-choice"
          @click="draft.monthlyCost = ''"
        >
          清空选择
        </button>
      </QuestionField>
      <QuestionField
        name="liveQuestions"
        title="最希望张导在直播间讲清楚什么？"
        hint="可多选。"
        :disabled="busy"
      >
        <ChoiceGroup
          v-model="draft.liveQuestions"
          name="liveQuestions"
          :options="OPTIONS.liveQuestions"
          multiple
          :max="LIMITS.liveQuestions"
        />
        <Transition name="expand"
          ><div
            v-if="draft.liveQuestions.includes('其他问题')"
            class="conditional"
          >
            <input
              v-model="draft.liveQuestionOther"
              class="field-input"
              aria-label="其他直播问题（选填）"
              placeholder="写下你想问的问题（选填）"
              maxlength="100"
            /></div
        ></Transition>
      </QuestionField>
    </div>
  </details>
</template>
