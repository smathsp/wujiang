<script setup>
import { watch } from "vue";
import ChoiceGroup from "./ChoiceGroup.vue";
import QuestionField from "./QuestionField.vue";
import LocationCard from "./LocationCard.vue";
import { OPTIONS, EXCLUSIVE, LIMITS } from "../model.js";
const draft = defineModel({ type: Object, required: true });
defineProps({ errors: { type: Object, default: () => ({}) }, busy: Boolean });
const questions = [
  { key: "location", title: "这张卡主要准备在哪个城市使用？" },
  { key: "audience", title: "无疆卡主要准备给谁使用？" },
  {
    key: "device",
    title: "这张卡主要准备插在哪台设备上？",
    hint: "本次每人领取 1 张卡，选择主要使用的设备。",
  },
  {
    key: "usage",
    title: "之前每个月实际需要多少流量？",
    hint: "填写预计使用这张卡的人，最近一个月的合计用量；估算也可以。",
  },
  {
    key: "activities",
    title: "每月流量主要用来做什么？",
    hint: "可多选。",
    multiple: true,
  },
  {
    key: "access",
    title: "你现在主要用什么方式上网？",
    hint: "可多选。",
    multiple: true,
  },
  {
    key: "problems",
    title: "目前最想解决哪些上网问题？",
    hint: "最多选 2 项。",
    multiple: true,
    wide: true,
  },
  {
    key: "story",
    title: "最希望无疆卡解决哪个具体问题？",
    hint: "写清谁在用、现在有什么麻烦、希望怎么解决。",
    text: true,
    max: 100,
    placeholder:
      "比如：我经常出差，想给随身 CPE 准备一张备用卡，需要时再买流量。",
  },
  {
    key: "startTime",
    title: "如果适合你，准备什么时候充值使用？",
    hint: "请先了解正式资费和设备适配情况，如实选择。",
    wide: true,
  },
  {
    key: "priorities",
    title: "对于流量卡，你最在意哪两个方面？",
    hint: "最多选 2 项。",
    multiple: true,
  },
  { key: "experience", title: "遇到过让你印象深刻的网络麻烦吗？" },
  {
    key: "discussion",
    title: "还有什么想吐槽，或想让张导讲清楚？",
    hint: "没有补充可以填“暂无”。",
    text: true,
    max: 150,
    placeholder: "比如：最想知道单 GB 价格，以及怎样查看和控制流量费用。",
  },
];
const followups = {
  audience: {
    key: "relationship",
    when: () => draft.value.audience === "其他人",
    title: "主要给谁使用？",
    placeholder: "如父母、朋友，不用填写姓名",
    max: 30,
  },
  device: {
    key: "deviceModel",
    when: () => draft.value.device === "其他 CPE",
    title: "这台 CPE 的具体型号",
    placeholder: "如 C2000 Pro、AK68",
    max: 80,
  },
  activities: {
    key: "activityOther",
    when: () => draft.value.activities.includes("其他用途"),
    title: "其他流量用途",
    placeholder: "简单说说你平时用流量做什么",
    max: 80,
  },
  access: {
    key: "accessOther",
    when: () => draft.value.access.includes("其他方式"),
    title: "目前的其他上网方式",
    placeholder: "填写当前联网方式",
    max: 80,
  },
  problems: {
    key: "problemOther",
    when: () => draft.value.problems.includes("其他问题"),
    title: "你遇到的其他网络问题",
    placeholder: "说说具体的困扰",
    max: 100,
  },
  priorities: {
    key: "priorityOther",
    when: () => draft.value.priorities.includes("其他方面"),
    title: "你还在意什么？",
    placeholder: "填写你在意的方面",
    max: 80,
  },
  experience: {
    key: "experienceStory",
    when: () => draft.value.experience === "有，想说说",
    title: "分享一次真实经历",
    hint: "发生了什么、有什么影响、试过什么办法？几句话就好。",
    placeholder: "比如：开会时热点断了，临时换网络还是没赶上汇报。",
    max: 200,
    text: true,
  },
};
for (const followup of Object.values(followups))
  watch(followup.when, (visible) => {
    if (!visible) draft.value[followup.key] = "";
  });
watch(
  () => draft.value.access.includes("CPE 流量卡"),
  (visible) => {
    if (!visible) draft.value.currentSetup = "";
  },
);
watch(
  () => draft.value.usageUnknown,
  (unknown) => {
    if (unknown) draft.value.usage = "";
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
    <LocationCard
      v-if="question.key === 'location'"
      v-model="draft.location"
      :invalid="!!errors.location"
    />
    <template v-else-if="question.key === 'usage'">
      <label
        class="usage-input"
        :class="{ disabled: draft.usageUnknown, invalid: errors.usage }"
        ><input
          v-model="draft.usage"
          :disabled="draft.usageUnknown"
          inputmode="decimal"
          type="text"
          maxlength="12"
          aria-label="每月实际流量"
          :aria-invalid="!!errors.usage || undefined"
          :aria-describedby="errors.usage ? 'usage-error' : undefined"
          placeholder="填写大概用量"
        /><span>GB / 月</span></label
      >
      <label class="check-row usage-unknown"
        ><input
          v-model="draft.usageUnknown"
          type="checkbox"
        />暂时不清楚用量</label
      >
      <p
        v-if="draft.previous?.usage && !draft.usage && !draft.usageUnknown"
        class="previous-answer"
      >
        上次填写：{{ draft.previous.usage }}，这次请填写大概的 GB 数。
      </p>
    </template>
    <template v-else-if="question.text">
      <textarea
        v-model="draft[question.key]"
        :name="question.key"
        :aria-label="question.title"
        :maxlength="question.max"
        rows="3"
        :placeholder="question.placeholder"
        :aria-invalid="!!errors[question.key] || undefined"
        :aria-describedby="
          errors[question.key] ? `${question.key}-error` : undefined
        "
      ></textarea>
      <div class="character-count">
        {{ draft[question.key].length }} / {{ question.max }}
      </div>
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
        ['problems', 'priorities'].includes(question.key) &&
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
        question.key === 'device' &&
        !draft.device &&
        draft.previous?.devices?.length
      "
      class="previous-answer"
    >
      上次填写：{{ draft.previous.devices.join("、") }}。本次领取 1
      张，请选择主要使用的设备。
    </p>
    <Transition name="expand"
      ><div
        v-if="followups[question.key]?.when()"
        class="conditional follow-up-wrap"
      >
        <QuestionField
          sub
          :name="followups[question.key].key"
          :title="followups[question.key].title"
          :hint="followups[question.key].hint"
          :error="errors[followups[question.key].key]"
        >
          <textarea
            v-if="followups[question.key].text"
            v-model="draft[followups[question.key].key]"
            class="field-input"
            :name="followups[question.key].key"
            :aria-label="followups[question.key].title"
            :placeholder="followups[question.key].placeholder"
            :maxlength="followups[question.key].max"
            :aria-invalid="!!errors[followups[question.key].key] || undefined"
            :aria-describedby="
              errors[followups[question.key].key]
                ? `${followups[question.key].key}-error`
                : undefined
            "
          ></textarea>
          <input
            v-else
            v-model="draft[followups[question.key].key]"
            class="field-input"
            :name="followups[question.key].key"
            :aria-label="followups[question.key].title"
            :placeholder="followups[question.key].placeholder"
            :maxlength="followups[question.key].max"
            :aria-invalid="!!errors[followups[question.key].key] || undefined"
            :aria-describedby="
              errors[followups[question.key].key]
                ? `${followups[question.key].key}-error`
                : undefined
            "
          />
          <div v-if="followups[question.key].text" class="character-count">
            {{ draft[followups[question.key].key].length }} /
            {{ followups[question.key].max }}
          </div>
        </QuestionField>
      </div></Transition
    >
    <Transition name="expand"
      ><div
        v-if="question.key === 'access' && draft.access.includes('CPE 流量卡')"
        class="conditional follow-up-wrap"
      >
        <QuestionField
          sub
          name="currentSetup"
          title="目前使用的设备和套餐"
          hint="不清楚套餐名称也可以如实填写。"
          :error="errors.currentSetup"
          ><input
            v-model="draft.currentSetup"
            class="field-input"
            aria-label="目前使用的设备和套餐"
            placeholder="如 Ultra + 天火卡，或套餐名称不清楚"
            maxlength="100"
            :aria-invalid="!!errors.currentSetup || undefined"
            :aria-describedby="
              errors.currentSetup ? 'currentSetup-error' : undefined
            "
        /></QuestionField></div
    ></Transition>
  </QuestionField>
</template>
