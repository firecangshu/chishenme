import { useState, useRef } from "react";
import {
  decide, makeReason, EMOJIS, EMOJI_MAP, DISH_IMAGE_MAP,
  AVOID_CATEGORIES, parseAvoidText, mergeAvoidCats,
  getCandidatePool, countAvoidCats, DISHES,
} from "./data.js";
import { loadLLMCfg, saveLLMCfg, parseAvoidByLLM, isLLMReady } from "./llmParser.js";
import "./App.css";

// 常用 OpenAI 兼容厂商一键填充（使用者只需再贴自己的 Key）
const LLM_PRESETS = [
  { name: "DeepSeek", baseURL: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { name: "通义千问", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  { name: "Kimi", baseURL: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  { name: "本地 Ollama", baseURL: "http://localhost:11434/v1", model: "qwen2.5:7b" },
];

const CAT_ID = (c) => c.key || c.tag;
const CATS_TO_IDS = (cats) => {
  const ids = [];
  if (cats?.spicy) ids.push("spicy");
  if (cats?.veggie) ids.push("veggie");
  if (cats?.tags) ids.push(...cats.tags);
  return ids;
};

const EMOJI_FOR = (d) => EMOJI_MAP[d.type] || "🍽️";
const DISH_IMG = (d) => {
  const f = DISH_IMAGE_MAP[d.name];
  if (!f) return null;
  return (
    <img
      className="dish-img"
      src={`images/${f}`}
      alt={d.name}
      loading="lazy"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
};

export default function App() {
  const [step, setStep] = useState(0);
  const [avoid, setAvoid] = useState("");              // 忌口自由文本
  const [quickAvoid, setQuickAvoid] = useState([]);    // 快捷分类选中项（规范 id）
  const [avoidCats, setAvoidCats] = useState(null);    // 最终结构化忌口 {spicy,veggie,tags}
  const [lightMode, setLightMode] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("recommend");
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState([]);
  const [llmCfg, setLlmCfg] = useState(loadLLMCfg); // BYOK，惰性读 localStorage
  const [showCfg, setShowCfg] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState(null); // {type: ok|fallback|warn|info, text}
  const avoidRef = useRef(null);

  function handleRecommend(userMode = "recommend", presetAvoid = "") {
    setMode(userMode);
    setResult(null);
    setAvoid("");
    setAvoidCats(null);
    setAiMsg(null);
    setAiBusy(false);
    // 首页预设（如「我不吃辣」）直接解析成已选快捷项
    const pre = parseAvoidText(presetAvoid);
    const ids = [];
    if (pre.spicy) ids.push("spicy");
    if (pre.veggie) ids.push("veggie");
    ids.push(...pre.tags);
    setQuickAvoid(ids);
    setStep(1);
    if (avoidRef.current) avoidRef.current.focus();
  }

  // 快捷项点选切换
  function toggleQuick(id) {
    setQuickAvoid(q => q.includes(id) ? q.filter(x => x !== id) : [...q, id]);
  }

  function labelOfIds(ids) {
    return ids.map(id => {
      const c = AVOID_CATEGORIES.find(x => CAT_ID(x) === id);
      return c ? c.label : id;
    });
  }

  // Agent 感知层：大模型理解自然语言忌口 → 回填结构化标签（人在回路，可再点改）
  async function runAIParse() {
    const text = avoid.trim();
    if (!text) {
      setAiMsg({ type: "warn", text: "先在输入框里描述你的忌口，再点 AI 识别" });
      return;
    }
    setAiBusy(true);
    setAiMsg(null);
    try {
      const cfg = loadLLMCfg();
      if (!isLLMReady(cfg)) {
        setShowCfg(true);
        setAiMsg({ type: "warn", text: "点下方「🔑 接入我的大模型」填一次你自己的 API Key（只存本机浏览器），接入后忌口识别更准" });
        return;
      }
      const cats = await parseAvoidByLLM(text, cfg);
      const ids = CATS_TO_IDS(cats);
      setQuickAvoid(q => [...new Set([...q, ...ids])]);
      const extra = cats.unknown?.length ? `；暂不支持筛选：${cats.unknown.join("、")}` : "";
      setAiMsg(ids.length
        ? { type: "ok", text: `AI 已识别并自动勾选：${labelOfIds(ids).join("、")}${extra}（如不对可点标签取消）` }
        : { type: "info", text: `AI 没识别到明确忌口${extra}，可直接点选下方标签` });
    } catch (err) {
      // 任何失败 → 本地规则兜底，流程不断
      const ids = CATS_TO_IDS(parseAvoidText(text));
      setQuickAvoid(q => [...new Set([...q, ...ids])]);
      setAiMsg({ type: "fallback", text: `AI 暂不可用（${err.message}），已用本地规则识别${ids.length ? "：" + labelOfIds(ids).join("、") : "，未识别到忌口"}` });
    } finally {
      setAiBusy(false);
    }
  }

  function persistCfg() {
    const saved = saveLLMCfg(llmCfg);
    setLlmCfg(saved);
    setAiMsg(isLLMReady(saved)
      ? { type: "ok", text: "✅ 大模型已接入，之后点「AI 智能识别」会调用模型，忌口理解更准" }
      : { type: "warn", text: "请填写完整接口地址和 API Key 后再保存" });
  }

  function fillPreset(p) {
    setLlmCfg(cfg => ({ ...cfg, baseURL: p.baseURL, model: p.model }));
  }

  const llmReady = isLLMReady(llmCfg);

  function confirmAvoid() {
    // 快捷项 → 结构化；文本 → 结构化；二者合并
    const quickCats = {
      spicy: quickAvoid.includes("spicy"),
      veggie: quickAvoid.includes("veggie"),
      tags: quickAvoid.filter(x => x !== "spicy" && x !== "veggie"),
    };
    const cats = mergeAvoidCats(quickCats, parseAvoidText(avoid));
    setAvoidCats(cats);
    setStep(2);
  }

  function confirmLight(want) {
    setLightMode(want);
    runDecision(want); // 显式传值，避免读到 setState 前的闭包旧值
  }

  // lightOverride：消除「setState 后同步读取」的闭包旧值问题
  function runDecision(lightOverride) {
    const lm = typeof lightOverride === "boolean" ? lightOverride : lightMode;
    const exclude = result?.dish?.name || "";
    // 忌口确定后的针对性候选池：素材库先剔除含忌口材料的菜，再随机分配
    const pool = getCandidatePool(avoidCats, lm);
    const meta = { poolSize: pool.length, total: DISHES.length, avoidCount: countAvoidCats(avoidCats) };
    const opts = { avoidCats, lightMode: lm, mode, exclude };
    if (mode === "blindbox") {
      setRolling(true);
      setTimeout(() => {
        const dish = decide(opts);
        setResult({ dish, reason: dish ? makeReason(dish, lm, "") : "", ...meta });
        setRolling(false);
        if (dish) setHistory(h => [...h, dish.name]);
      }, 1200);
    } else {
      const dish = decide(opts);
      setResult({ dish, reason: dish ? makeReason(dish, lm, "") : "", ...meta });
      if (dish) setHistory(h => [...h, dish.name]);
    }
    setStep(3);
  }

  function reset() {
    setStep(0);
    setAvoid("");
    setQuickAvoid([]);
    setAvoidCats(null);
    setLightMode(false);
    setResult(null);
    setHistory([]);
    setAiMsg(null);
    setAiBusy(false);
  }

  function changeOne() {
    runDecision();
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand-badge" aria-hidden="true">
          <span className="brand-emoji-fallback">🍜</span>
          <img
            className="brand-img"
            src="images/logo.jpg"
            alt="吃什么"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
        <h1>今天到底吃什么呢？</h1>
        <p className="subtitle">饭点决策助手 · 30 秒搞定，不纠结</p>
      </header>

      <main className="main">
        {step === 0 && (
          <section className="home">
            <button
              className="hero-btn primary"
              onClick={() => handleRecommend("recommend")}
            >
              <span className="hero-icon" aria-hidden="true">🍽️</span>
              <span className="hero-text">
                <span className="hero-title">吃啥？</span>
                <span className="hero-desc">帮我决定，不纠结</span>
              </span>
              <span className="hero-arrow" aria-hidden="true">→</span>
            </button>
            <button
              className="hero-btn blind"
              onClick={() => handleRecommend("blindbox")}
            >
              <span className="hero-icon" aria-hidden="true">🎲</span>
              <span className="hero-text">
                <span className="hero-title">摇一个</span>
                <span className="hero-desc">盲盒惊喜，交给运气</span>
              </span>
              <span className="hero-arrow" aria-hidden="true">→</span>
            </button>
            <div className="presets">
              <button className="preset-chip" onClick={() => handleRecommend("recommend")}>☀️ 中午吃啥</button>
              <button className="preset-chip" onClick={() => handleRecommend("blindbox")}>🎰 来个盲盒</button>
              <button className="preset-chip" onClick={() => handleRecommend("recommend", "辣")}>🌶️ 我不吃辣</button>
            </div>
          </section>
        )}

        {(step === 1 || step === 2) && (
          <div className="steps" aria-label="步骤进度">
            <span className={`step-dot ${step === 2 ? "done" : "active"}`}>1</span>
            <span className={`step-line ${step === 2 ? "done" : ""}`}></span>
            <span className={`step-dot ${step === 2 ? "active" : ""}`}>2</span>
            <span className="step-line"></span>
            <span className="step-dot">3</span>
          </div>
        )}

        {step === 1 && (
          <section className="ask ask-avoid">
            <h2>第 1 步 · 忌口调查</h2>
            <p>点选忌口 / 过敏原（可多选），也可在下方直接输入</p>

            <div className="avoid-groups">
              {["口味", "肉类", "过敏原", "饮食"].map(g => (
                <div className="avoid-group" key={g}>
                  <span className="avoid-group-label">{g}</span>
                  <div className="avoid-chips">
                    {AVOID_CATEGORIES.filter(c => c.group === g).map(c => {
                      const id = CAT_ID(c);
                      const on = quickAvoid.includes(id);
                      return (
                        <button
                          type="button"
                          key={id}
                          className={`avoid-chip ${on ? "on" : ""}`}
                          aria-pressed={on}
                          onClick={() => toggleQuick(id)}
                        >
                          <span aria-hidden="true">{c.emoji}</span> {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <input
              ref={avoidRef}
              className="input-avoid"
              placeholder="补充输入：如「痛风不吃海鲜和辣、牛奶也不行」，可点 AI 智能识别"
              value={avoid}
              onChange={e => setAvoid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runAIParse()}
              aria-label="忌口输入"
            />

            <div className="ai-row">
              <button
                type="button"
                className="ai-btn"
                onClick={runAIParse}
                disabled={aiBusy}
              >
                {aiBusy ? "⏳ AI 识别中…" : "🤖 AI 智能识别这句忌口"}
              </button>
              <button
                type="button"
                className={`ai-cfg-toggle ${llmReady ? "connected" : ""}`}
                onClick={() => setShowCfg(s => !s)}
                aria-expanded={showCfg}
              >
                {showCfg ? "收起" : (llmReady ? "✅ 大模型已接入 · 点击修改" : "🔑 接入我的大模型")}
              </button>
            </div>

            {aiMsg && <div className={`ai-msg ${aiMsg.type}`} role="status">{aiMsg.text}</div>}

            {showCfg && (
              <div className="ai-cfg">
                <div className="ai-cfg-title">接入你自己的大模型 API（可选，接入后忌口识别更准）</div>

                <div className="ai-presets">
                  {LLM_PRESETS.map(p => (
                    <button
                      type="button"
                      key={p.name}
                      className="ai-preset"
                      onClick={() => fillPreset(p)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <label className="ai-field">
                  <span className="ai-field-label">接口地址（API 地址）</span>
                  <input
                    className="ai-input"
                    placeholder="https://api.deepseek.com/v1"
                    value={llmCfg.baseURL}
                    onChange={e => setLlmCfg({ ...llmCfg, baseURL: e.target.value })}
                    aria-label="接口地址"
                  />
                </label>
                <label className="ai-field">
                  <span className="ai-field-label">模型名称</span>
                  <input
                    className="ai-input"
                    placeholder="deepseek-chat"
                    value={llmCfg.model}
                    onChange={e => setLlmCfg({ ...llmCfg, model: e.target.value })}
                    aria-label="模型名"
                  />
                </label>
                <label className="ai-field">
                  <span className="ai-field-label">API Key（你自己的密钥）</span>
                  <input
                    className="ai-input"
                    type="password"
                    placeholder="sk-...（只存本机浏览器，不会上传，本地 Ollama 可留空）"
                    value={llmCfg.apiKey}
                    onChange={e => setLlmCfg({ ...llmCfg, apiKey: e.target.value })}
                    aria-label="API Key"
                  />
                </label>
                <button type="button" className="confirm-btn ai-save" onClick={persistCfg}>保存并接入</button>
                <p className="ai-note">点上方厂商名可自动填好地址和模型，再粘贴你的 Key 即可。兼容任何 OpenAI 协议接口；Key 仅保存在本机 localStorage、请求直发模型厂商。不接入也能用，自动走内置本地规则识别。</p>
              </div>
            )}

            <button className="confirm-btn" onClick={confirmAvoid}>
              {quickAvoid.length > 0 ? `已选 ${quickAvoid.length} 项，确认继续 →` : "确认，继续 →"}
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="ask">
            <h2>第 2 步 · 需求澄清</h2>
            <p>今天有减脂 / 控制热量的需求吗？</p>
            <button className="opt-card light" onClick={() => confirmLight(true)}>
              <span className="opt-icon" aria-hidden="true">🥗</span>
              <span className="opt-text">
                <span className="opt-title">要，推荐轻食</span>
                <span className="opt-desc">优先低卡 ≤500 kcal，排除高卡</span>
              </span>
              <span className="opt-check" aria-hidden="true">✓</span>
            </button>
            <button className="opt-card normal" onClick={() => confirmLight(false)}>
              <span className="opt-icon" aria-hidden="true">🍽️</span>
              <span className="opt-text">
                <span className="opt-title">不用，随便吃</span>
                <span className="opt-desc">不过滤热量，正常推荐</span>
              </span>
              <span className="opt-check" aria-hidden="true">✓</span>
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="result">
            {rolling && (
              <div className="rolling">
                <div className="slot-row" aria-hidden="true">{EMOJIS.join(" ")}</div>
                <p className="rolling-text">旋转中...</p>
              </div>
            )}

            {!rolling && result && result.dish && (
              <>
                {mode === "blindbox" && (
                  <div className="slot-reveal" aria-hidden="true">🎰 {EMOJIS.join(" ")} 🎰</div>
                )}
                <div className="dish-card">
                  <div className="dish-emoji" aria-hidden="true">
                    <span className="dish-emoji-fallback">{EMOJI_FOR(result.dish)}</span>
                    {DISH_IMG(result.dish)}
                  </div>
                  <div className="dish-name">{result.dish.name}</div>
                  <div className="dish-meta">
                    <span className="kcal">🔥 约 {result.dish.kcal} kcal</span>
                    <span className="region">📍 {result.dish.region}</span>
                    <span className="time">⏱ {result.dish.time} min</span>
                    <span className="price">💰 {result.dish.price}</span>
                  </div>
                  <div className="reason">💡 {result.reason}</div>
                  {result.avoidCount > 0 && (
                    <div className="pool-hint">
                      🎯 已按 {result.avoidCount} 项忌口，从 {result.total} 道中剔除后剩 {result.poolSize} 道，随机为你挑中这道
                    </div>
                  )}
                  {lightMode && result.dish.kcal <= 500 && (
                    <div className="light-hint">✅ 属于轻食范围（≤500 kcal）</div>
                  )}
                </div>
                <div className="actions">
                  <button className="action-btn solid" onClick={changeOne}>🔄 换一个</button>
                  <button className="action-btn ghost" onClick={reset}>❌ 换顿再说</button>
                </div>
              </>
            )}

            {!rolling && result && !result.dish && (
              <div className="empty">
                <div className="empty-emoji" aria-hidden="true">😅</div>
                <p>按当前忌口 / 轻食条件筛选后没有匹配的菜，试试减少几项忌口</p>
                <button className="confirm-btn" onClick={() => setStep(1)}>返回调整忌口</button>
              </div>
            )}
          </section>
        )}
      </main>

      {history.length > 0 && (
        <div className="history">
          <div className="history-label">🔁 本轮试过</div>
          <div className="history-tags">
            {history.slice(-5).map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>
      )}

      <footer className="disclaimer">
        ⚠️ 本应用为娱乐决策工具，所有推荐仅供参考，不构成任何医疗、营养、食品安全建议。热量值按常见做法估算，实际可因食材/做法不同有 ±200 kcal 浮动。
      </footer>
    </div>
  );
}
