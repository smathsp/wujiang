"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = "wujiang.signup.v1";
const blank = () => ({
  audience: "",
  device: "",
  deviceModel: "",
  usage: "",
  plans: [],
  story: "",
  feesAccepted: false,
  consent: false,
});
const allowed = {
  audience: ["我自己", "父母或家人", "家庭多人共享", "暂时没想好"],
  device: [
    "Ultra，已经收到",
    "Ultra，等待发货",
    "其他 CPE 设备",
    "暂时没有设备",
  ],
  usage: [
    "50GB 以内",
    "51—100GB",
    "101—200GB",
    "201—300GB",
    "300GB 以上",
    "不清楚",
  ],
  plans: ["日常上网", "家庭共享", "备用网络", "搭配天火卡", "双网络聚合"],
};
const escapeHTML = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function sanitize(input) {
  const a = {
    ...blank(),
    ...(input && typeof input === "object" ? input : {}),
  };
  for (const key of ["audience", "device", "usage"])
    if (!allowed[key].includes(a[key])) a[key] = "";
  a.deviceModel =
    typeof a.deviceModel === "string" ? a.deviceModel.slice(0, 60) : "";
  a.story = typeof a.story === "string" ? a.story.slice(0, 100) : "";
  a.plans = Array.isArray(a.plans)
    ? a.plans.filter((v) => allowed.plans.includes(v)).slice(0, 2)
    : [];
  a.feesAccepted = a.feesAccepted === true;
  a.consent = a.consent === true;
  return a;
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return {
      signedIn: s?.signedIn === true,
      introSeen: s?.introSeen === true,
      application: s?.application ? sanitize(s.application) : null,
      draft: sanitize(s?.draft),
      updatedAt: typeof s?.updatedAt === "string" ? s.updatedAt : null,
    };
  } catch {
    return {
      signedIn: false,
      introSeen: false,
      application: null,
      draft: blank(),
      updatedAt: null,
    };
  }
}
let state = load();
let editing = false;
let toastTimer;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast("浏览器暂时无法保存，本页仍可继续填写。");
  }
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
}
function choices(key, multi = false) {
  const value = state.draft[key];
  return `<div class="choices">${allowed[key].map((option) => `<label class="choice"><input type="${multi ? "checkbox" : "radio"}" name="${key}" value="${escapeHTML(option)}" ${multi ? (value.includes(option) ? "checked" : "") : value === option ? "checked" : ""}><span>${escapeHTML(option)}</span></label>`).join("")}</div>`;
}
function select(key, placeholder) {
  return `<select name="${key}" aria-label="${placeholder}" required><option value="" disabled ${state.draft[key] ? "" : "selected"}>${placeholder}</option>${allowed[key].map((option) => `<option value="${escapeHTML(option)}" ${state.draft[key] === option ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}</select>`;
}
function logout() {
  state.signedIn = false;
  editing = false;
  save();
  render();
  window.scrollTo(0, 0);
}
function render() {
  if (!state.signedIn) {
    renderLogin();
    return;
  }
  if (state.application && !editing) {
    renderReceived();
    return;
  }
  renderForm();
}
function renderLogin() {
  $("#app").innerHTML =
    `<section class="login-view"><div class="login-symbol" aria-hidden="true">↗</div><h1 class="page-heading">无疆卡首批报名</h1><p class="page-hint">登录识别 Ultra 订单和灯牌等级，<br>填好表，等待首批结果。</p><button id="sign-in" class="primary-button">有赞登录 <span>↗</span></button><p class="login-note">演示登录，无需输入账号或密码</p><span class="batch-pill">首批预计 2,000 张</span></section>`;
  $("#sign-in").onclick = () => {
    state.signedIn = true;
    save();
    render();
    window.scrollTo(0, 0);
  };
}
function renderForm() {
  const a = state.draft;
  $("#app").innerHTML =
    `<section><h1 class="page-heading">${state.application ? "修改报名信息" : "填写报名信息"}</h1><div class="account-strip"><span class="account-chip">✓ Ultra 已购</span><span class="account-chip">灯牌 12 级</span><span class="account-chip">演示身份</span><button class="logout" id="sign-out">退出</button></div><form class="application-form" id="application-form" novalidate>
 <fieldset class="question"><legend><span class="question-index">01</span>这张卡主要给谁用？<span class="required">*</span></legend>${choices("audience")}</fieldset>
 <fieldset class="question"><legend><span class="question-index">02</span>准备用什么设备？<span class="required">*</span></legend>${select("device", "请选择设备")}<div class="conditional" id="model-field" ${a.device === "其他 CPE 设备" ? "" : "hidden"}><input class="field-input" name="deviceModel" value="${escapeHTML(a.deviceModel)}" maxlength="60" placeholder="填写设备型号" aria-label="设备型号"></div></fieldset>
 <fieldset class="question"><legend><span class="question-index">03</span>每月大概用多少流量？<span class="required">*</span></legend>${select("usage", "请选择月用量")}</fieldset>
 <fieldset class="question"><legend><span class="question-index">04</span>想怎么使用无疆卡？<span class="required">*</span><span class="short-hint">最多选 2 项</span></legend>${choices("plans", true)}</fieldset>
 <div class="question"><label class="field-label" for="story"><span class="question-index">05</span>说说你的使用场景<span class="optional">选填</span></label><textarea id="story" name="story" rows="2" maxlength="100" placeholder="比如：给爸妈共享流量，或者让闲置 CPE 当备用网络。">${escapeHTML(a.story)}</textarea><div class="character-count"><span id="story-count">${a.story.length}</span> / 100</div></div>
 <div class="confirmation"><label class="check-row"><input type="checkbox" name="feesAccepted" ${a.feesAccepted ? "checked" : ""}><span>我已了解：<b>卡片免费，邮费 9.9 元，流量另行计费。</b></span></label><label class="check-row"><input type="checkbox" name="consent" ${a.consent ? "checked" : ""}><span>愿意将场景描述匿名用于活动直播及短视频。<br><span class="optional">选填，不影响报名。</span></span></label></div>
 <div class="submit-area"><div class="form-error" id="form-error" role="alert" tabindex="-1" hidden></div><button class="primary-button" type="submit">${state.application ? "保存修改" : "提交报名"} <span>↗</span></button><p class="submit-note">所有人可报名，Ultra 用户、灯牌等级优先参考。<br>提交后请等待结果，报名不代表已经获得名额。</p>${state.application ? '<button type="button" class="cancel-edit" id="cancel-edit">暂不修改</button>' : ""}</div>
 </form></section>`;
  $("#sign-out").onclick = logout;
  const form = $("#application-form");
  form.addEventListener("input", (event) => {
    const el = event.target;
    if (!Object.hasOwn(state.draft, el.name)) return;
    if (
      el.tagName === "TEXTAREA" ||
      (el.tagName === "INPUT" && el.type === "text")
    )
      state.draft[el.name] = el.value;
    if (el.name === "story") $("#story-count").textContent = el.value.length;
    clearError();
    save();
  });
  form.addEventListener("change", (event) => {
    const el = event.target;
    const key = el.name;
    if (!Object.hasOwn(state.draft, key)) return;
    if (key === "plans") {
      const selected = $$("input[name=plans]:checked").map(
        (item) => item.value,
      );
      if (selected.length > 2) {
        el.checked = false;
        toast("最多选择 2 项");
        return;
      }
      state.draft.plans = selected;
    } else if (el.type === "checkbox") state.draft[key] = el.checked;
    else state.draft[key] = el.value;
    if (key === "device") {
      $("#model-field").hidden = el.value !== "其他 CPE 设备";
      if (el.value !== "其他 CPE 设备") {
        state.draft.deviceModel = "";
        $("input[name=deviceModel]").value = "";
      }
    }
    clearError();
    save();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const a = state.draft;
    if (!a.audience) return error("请选择主要使用的人。");
    if (!a.device) return error("请选择设备。");
    if (a.device === "其他 CPE 设备" && !a.deviceModel.trim())
      return error("请填写设备型号。");
    if (!a.usage) return error("请选择大致月用量。");
    if (!a.plans.length) return error("请选择使用方式。");
    if (a.plans.length > 2) return error("使用方式最多选择 2 项。");
    if (!a.feesAccepted) return error("请确认领取费用与流量计费说明。");
    state.application = sanitize(a);
    state.draft = { ...state.application, plans: [...state.application.plans] };
    state.updatedAt = new Date().toISOString();
    editing = false;
    save();
    render();
    window.scrollTo(0, 0);
  });
  if ($("#cancel-edit"))
    $("#cancel-edit").onclick = () => {
      state.draft = sanitize(state.application);
      editing = false;
      save();
      render();
      window.scrollTo(0, 0);
    };
}
function clearError() {
  const el = $("#form-error");
  if (el) el.hidden = true;
}
function error(message) {
  const el = $("#form-error");
  el.textContent = message;
  el.hidden = false;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "center" });
}
function renderReceived() {
  const a = state.application;
  $("#app").innerHTML =
    `<section class="received-view"><div class="received-symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m8 16 6 6L25 10"/></svg></div><h1>已收到，请等待。</h1><p class="page-hint">报名信息已保存，<br>请等待首批结果通知。</p><span class="batch-pill">当前为本地演示状态</span><div class="received-info"><div class="received-row"><span>主要使用人</span><span>${escapeHTML(a.audience)}</span></div><div class="received-row"><span>设备</span><span>${escapeHTML(a.device === "其他 CPE 设备" ? a.deviceModel : a.device)}</span></div><div class="received-row"><span>每月流量</span><span>${escapeHTML(a.usage)}</span></div><div class="received-row"><span>使用方式</span><span>${a.plans.map(escapeHTML).join("、")}</span></div></div><button class="secondary-button" id="edit-application">修改报名信息</button><button class="logout" id="sign-out">退出登录</button></section>`;
  $("#edit-application").onclick = () => {
    state.draft = sanitize(state.application);
    editing = true;
    render();
    window.scrollTo(0, 0);
  };
  $("#sign-out").onclick = logout;
}
$("#intro-button").onclick = () => $("#intro-dialog").showModal();
$("#intro-continue").onclick = () => {
  state.introSeen = true;
  save();
  $("#intro-dialog").close();
};
$("#intro-dialog").addEventListener("cancel", () => {
  state.introSeen = true;
  save();
});
render();
if (!state.introSeen) $("#intro-dialog").showModal();
