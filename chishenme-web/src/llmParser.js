// 吃什么 · Agent 感知层：把自然语言忌口交给大模型，收敛成结构化 avoidCats
// 设计原则：
// 1) BYOK：apiKey 只存用户本机 localStorage，不写死、不上报作者服务器；
// 2) 模型只负责"理解"，输出必须落在素材库标签白名单内（白名单之外进 unknown，不进决策）；
// 3) 任何失败（未配 Key / 网络错 / 脏 JSON）都抛错，由调用方回退本地词典 parseAvoidText。
import { AVOID_CATEGORIES } from "./data.js";

// 素材库当前支持的成分标签（忌口项的合法命名空间）
export const LEGAL_TAGS = AVOID_CATEGORIES.filter(c => c.tag).map(c => c.tag);

const CFG_STORAGE_KEY = "csm_llm_cfg_v1";

export const DEFAULT_LLM_CFG = {
  baseURL: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
};

export function loadLLMCfg() {
  try {
    const raw = localStorage.getItem(CFG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LLM_CFG };
    return { ...DEFAULT_LLM_CFG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_LLM_CFG };
  }
}

export function saveLLMCfg(cfg) {
  const clean = {
    baseURL: (cfg.baseURL || "").trim().replace(/\/+$/, ""),
    apiKey: (cfg.apiKey || "").trim(),
    model: (cfg.model || "").trim() || DEFAULT_LLM_CFG.model,
  };
  localStorage.setItem(CFG_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export function buildSystemPrompt() {
  return [
    "你是「饭点决策助手」的忌口解析器（Agent 的感知模块）。把用户用自然语言描述的饮食忌口、过敏、饮食限制解析成严格 JSON。",
    "只输出一个 JSON 对象，不要输出任何解释、前后缀或 markdown 代码块。",
    "JSON 结构：{\"spicy\": boolean, \"veggie\": boolean, \"tags\": string[], \"unknown\": string[]}",
    "字段含义：",
    "- spicy：忌辣/不吃辣/怕辣/不能吃辣 为 true；",
    "- veggie：素食/吃素/全素/不吃任何肉类和鱼虾 为 true（蛋奶素也算）；",
    `- tags：成分忌口，只能从以下白名单中原样选取：[${LEGAL_TAGS.join("、")}]；`,
    "  映射示例：猪/排骨/腊肉/火腿→猪肉；牛/牛排→牛肉；羊→羊肉；鸡/鸡腿→鸡肉；",
    "  鱼/虾/蟹/贝/水产→海鲜；牛奶/奶酪/黄油/酸奶/乳糖不耐→乳制品；",
    "  小麦/面/面筋/麸质过敏→麸质；黄豆/豆腐/酱油→大豆；",
    "- unknown：用户明确忌口、但不在白名单内的类别（如 高嘌呤、生冷、油腻、香菜），用简短中文词原样放入，供前端提示人工处理；",
    "注意：",
    "-「清淡」「少油少盐」「好吃的」这类偏好或闲聊不是忌口，对应字段留空；",
    "- 拿不准的成分不要硬塞进 tags，放 unknown；",
    "- 输出示例：用户「我不吃辣，花生过敏，最近痛风别来高嘌呤的」→",
    "{\"spicy\":true,\"veggie\":false,\"tags\":[\"花生\"],\"unknown\":[\"高嘌呤\"]}",
  ].join("\n");
}

// 从可能带代码块/前后缀的模型输出里截取第一个平衡 JSON 对象
export function extractJson(text) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const frag = s.slice(start, end + 1);
  try { return JSON.parse(frag); } catch { return null; }
}

// 把模型输出收敛到合法结构：标签过白名单、布尔归一、unknown 限长
export function sanitizeAvoid(obj) {
  if (!obj || typeof obj !== "object") return null;
  const tags = (Array.isArray(obj.tags) ? obj.tags : [])
    .map(t => String(t ?? "").trim())
    .filter(t => LEGAL_TAGS.includes(t));
  const unknown = (Array.isArray(obj.unknown) ? obj.unknown : [])
    .map(t => String(t ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);
  return {
    spicy: !!obj.spicy,
    veggie: !!obj.veggie,
    tags: [...new Set(tags)],
    unknown: [...new Set(unknown)],
  };
}

export function isEmptyCats(c) {
  return !c || (!c.spicy && !c.veggie && c.tags.length === 0 && (c.unknown || []).length === 0);
}

// 本地端点（Ollama / LM Studio 等）无需 Key
export function isLocalEndpoint(baseURL = "") {
  return /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(baseURL);
}

// 是否已具备调用条件：有 Key，或指向免 Key 的本地端点
export function isLLMReady(cfg) {
  return !!cfg && !!cfg.baseURL && (!!cfg.apiKey || isLocalEndpoint(cfg.baseURL));
}

// 调用 OpenAI 兼容 /chat/completions（DeepSeek、通义兼容模式、Moonshot、本地 Ollama 等均可）
export async function parseAvoidByLLM(text, cfg) {
  if (!cfg || !cfg.baseURL) {
    const e = new Error("未配置接口地址");
    e.code = "NO_BASE";
    throw e;
  }
  if (!cfg.apiKey && !isLocalEndpoint(cfg.baseURL)) {
    const e = new Error("未配置 API Key");
    e.code = "NO_KEY";
    throw e;
  }
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`; // 本地端点可无鉴权头
  let res;
  try {
    res = await fetch(`${cfg.baseURL.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: String(text).slice(0, 200) },
        ],
      }),
    });
  } catch (netErr) {
    const e = new Error("网络请求失败：" + netErr.message);
    e.code = "NETWORK";
    throw e;
  }
  if (!res.ok) {
    const e = new Error(`模型接口返回 ${res.status}`);
    e.code = "HTTP";
    throw e;
  }
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const parsed = sanitizeAvoid(extractJson(content));
  if (!parsed) {
    const e = new Error("模型返回无法解析");
    e.code = "BAD_JSON";
    throw e;
  }
  return parsed;
}
