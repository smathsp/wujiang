<script setup>
import { computed, ref, watch } from "vue";
import ChoiceGroup from "./ChoiceGroup.vue";
import QuestionField from "./QuestionField.vue";
import LocationCard from "./LocationCard.vue";
import AutoTextarea from "./AutoTextarea.vue";
import {
  OPTIONS,
  EXCLUSIVE,
  LIMITS,
  DEVICE_MODELS,
  splitDeviceModels,
  toggleDeviceModel,
} from "../model.js";
const draft = defineModel({ type: Object, required: true });
defineProps({ errors: { type: Object, default: () => ({}) }, busy: Boolean });
defineEmits(["open-city"]);
const deviceNotice = ref("");
const questions = [
  { key: "location", title: "这张卡主要准备在哪个城市使用？" },
  { key: "audience", title: "无疆卡主要准备给谁使用？" },
  {
    key: "device",
    title: "你准备将无疆卡用在哪些设备上？",
    hint: "可多选。",
    multiple: true,
  },
  {
    key: "usage",
    title: "之前每个月实际需要多少流量？",
    hint: "参考最近一个月的合计用量，估算也可以。",
  },
  {
    key: "activities",
    title: "每月流量主要用来做什么？",
    hint: "可多选。",
    multiple: true,
    compact: true,
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
    hint: "谁在用、有什么麻烦、希望怎么解决。",
    text: true,
    max: 100,
    placeholder: "写下你的实际情况，几句话就好",
    examples: [
      "我经常出差，想给随身 CPE 准备一张备用卡，需要时再买流量。",
      "爸妈平时用量不多，想给他们的 CPE 找个按需购买流量的方案。",
    ],
  },
  {
    key: "startTime",
    title: "如果适合你，准备什么时候充值使用？",
    hint: "结合正式资费和设备适配情况，如实选择。",
    wide: true,
  },
  {
    key: "priorities",
    title: "对于流量卡，你最在意哪两个方面？",
    hint: "最多选 2 项。",
    multiple: true,
    compact: true,
  },
  { key: "experience", title: "遇到过让你印象深刻的网络麻烦吗？" },
  { key: "discussion", title: "还有什么想吐槽，或想让张导讲清楚？" },
];
const followups = {
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
    hint: "发生了什么、有什么影响、试过什么办法？",
    placeholder: "几句话说说这次经历",
    max: 200,
    text: true,
    examples: [
      "开视频会议时热点断了，临时换网络也没赶上汇报。后来准备了备用卡，希望再遇到时可以及时切换。",
    ],
  },
};
const relationshipChoice = computed({
  get: () => draft.value.relationshipKind,
  set: (kind) => {
    const before = draft.value.relationshipKind;
    draft.value.relationshipKind = kind;
    if (kind !== "其他") draft.value.relationship = kind;
    else if (before !== "其他") draft.value.relationship = "";
  },
});
const discussionChoice = computed({
  get: () => draft.value.discussionChoice,
  set: (value) => {
    const before = draft.value.discussionChoice;
    draft.value.discussionChoice = value;
    if (value === "暂时没有") draft.value.discussion = "暂无";
    else if (before === "暂时没有") draft.value.discussion = "";
  },
});
function chooseModel(model) {
  const next = toggleDeviceModel(draft.value.deviceModel, model);
  deviceNotice.value = next === null ? "型号较多，请在输入框中简写。" : "";
  if (next !== null) draft.value.deviceModel = next;
}
function markSetupUnknown() {
  const value = draft.value.currentSetup.trim();
  if (value.includes("套餐名称不清楚")) return;
  const next = value ? `${value}，套餐名称不清楚` : "套餐名称不清楚";
  if (next.length <= 100) draft.value.currentSetup = next;
}
for (const followup of Object.values(followups))
  watch(followup.when, (visible) => {
    if (!visible) draft.value[followup.key] = "";
  });
watch(
  () => draft.value.audience,
  (value) => {
    if (value !== "其他人") {
      draft.value.relationship = "";
      draft.value.relationshipKind = "";
    }
  },
);
watch(
  () => draft.value.device.includes("其他 CPE"),
  (visible) => {
    if (!visible) {
      draft.value.deviceModel = "";
      deviceNotice.value = "";
    }
  },
);
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
      @open-city="$emit('open-city')"
    />
    <template v-else-if="question.key === 'usage'">
      <label
        class="usage-input"
        :class="{ disabled: draft.usageUnknown, invalid: errors.usage }"
        ><input
          v-model="draft.usage"
          :disabled="draft.usageUnknown"
          inputmode="decimal"
          enterkeyhint="done"
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
    <AutoTextarea
      v-else-if="question.text"
      v-model="draft[question.key]"
      :name="question.key"
      :label="question.title"
      :max="question.max"
      :placeholder="question.placeholder"
      :examples="question.examples"
      :invalid="!!errors[question.key]"
    />
    <template v-else-if="question.key === 'discussion'">
      <ChoiceGroup
        v-model="discussionChoice"
        name="discussion"
        :options="OPTIONS.discussionChoice"
        :invalid="!!errors.discussion"
      />
      <div v-if="draft.discussionChoice === '有想说的'" class="conditional">
        <AutoTextarea
          v-model="draft.discussion"
          name="discussion"
          label="想吐槽或想了解的问题"
          :max="150"
          placeholder="写下想问的问题或想吐槽的事"
          :examples="['最想知道单 GB 的价格，以及怎样查看和控制流量费用。']"
          :invalid="!!errors.discussion"
        />
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
      :compact="question.compact"
      :class="{ 'choices-wide': question.wide }"
    />
    <p
      v-if="['problems', 'priorities'].includes(question.key)"
      class="selection-count"
      aria-live="polite"
    >
      已选 {{ draft[question.key].length }} / 2
    </p>
    <div
      v-if="question.key === 'audience' && draft.audience === '其他人'"
      class="conditional follow-up-wrap"
    >
      <QuestionField
        sub
        name="relationship"
        title="主要给谁使用？"
        :error="errors.relationship"
      >
        <ChoiceGroup
          v-model="relationshipChoice"
          name="relationship"
          :options="OPTIONS.relationshipKind"
          compact
          :invalid="!!errors.relationship"
        />
        <input
          v-if="draft.relationshipKind === '其他'"
          v-model="draft.relationship"
          class="field-input conditional"
          aria-label="其他使用对象"
          placeholder="填写与你的关系，不用姓名"
          maxlength="30"
          :aria-invalid="!!errors.relationship || undefined"
          :aria-describedby="
            errors.relationship ? 'relationship-error' : undefined
          "
        />
      </QuestionField>
    </div>
    <div
      v-if="question.key === 'device' && draft.device.includes('其他 CPE')"
      class="conditional follow-up-wrap"
    >
      <QuestionField
        sub
        name="deviceModel"
        title="其他 CPE 的具体型号"
        hint="可填写多个，也可点选常见型号。"
        :error="errors.deviceModel"
      >
        <input
          v-model="draft.deviceModel"
          class="field-input"
          aria-label="其他 CPE 的具体型号"
          placeholder="输入型号，如 C2000 Pro、AK68"
          maxlength="80"
          :aria-invalid="!!errors.deviceModel || undefined"
          :aria-describedby="
            errors.deviceModel ? 'deviceModel-error' : undefined
          "
        />
        <div class="quick-answers">
          <button
            v-for="model in DEVICE_MODELS"
            :key="model"
            type="button"
            :aria-pressed="splitDeviceModels(draft.deviceModel).includes(model)"
            @click="chooseModel(model)"
          >
            {{ model
            }}<span aria-hidden="true">{{
              splitDeviceModels(draft.deviceModel).includes(model) ? "✓" : "+"
            }}</span>
          </button>
        </div>
        <p v-if="deviceNotice" class="field-hint" role="status">
          {{ deviceNotice }}
        </p>
      </QuestionField>
    </div>
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
          <AutoTextarea
            v-if="followups[question.key].text"
            v-model="draft[followups[question.key].key]"
            :name="followups[question.key].key"
            :label="followups[question.key].title"
            :max="followups[question.key].max"
            :placeholder="followups[question.key].placeholder"
            :examples="followups[question.key].examples"
            :invalid="!!errors[followups[question.key].key]"
          />
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
        </QuestionField></div
    ></Transition>
    <Transition name="expand"
      ><div
        v-if="question.key === 'access' && draft.access.includes('CPE 流量卡')"
        class="conditional follow-up-wrap"
      >
        <QuestionField
          sub
          name="currentSetup"
          title="目前使用的设备和套餐"
          :error="errors.currentSetup"
        >
          <input
            v-model="draft.currentSetup"
            class="field-input"
            aria-label="目前使用的设备和套餐"
            placeholder="如 Ultra + 天火卡"
            maxlength="100"
            :aria-invalid="!!errors.currentSetup || undefined"
            :aria-describedby="
              errors.currentSetup ? 'currentSetup-error' : undefined
            "
          />
          <div class="quick-answers">
            <button
              type="button"
              :disabled="
                draft.currentSetup.includes('套餐名称不清楚') ||
                draft.currentSetup.trim().length > 90
              "
              @click="markSetupUnknown"
            >
              {{
                draft.currentSetup.includes("套餐名称不清楚")
                  ? "已填写：套餐名称不清楚"
                  : "套餐名称不清楚"
              }}
            </button>
          </div>
        </QuestionField>
      </div></Transition
    >
  </QuestionField>
</template>
