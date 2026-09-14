import { useState, useRef, useMemo, useEffect } from "react";
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

// ===== 老虎机组件：结果揭晓仪式 =====
// ready 静止态（使用者点「开始摇」才启动）→ spinning 三列依次停止 → 中间行对齐最终选中的菜
function SlotMachine({ pool, finalDish, mode, onDone }) {
  const ROW_H = 56;
  const [phase, setPhase] = useState("ready"); // ready | spinning
  const [stoppedCols, setStoppedCols] = useState([true, true, true]); // ready 时先静止

  // 每列滚动内容：70% 菜名 + 30% 纯 emoji 符号混合，第17项=第1项实现无缝循环
  const reels = useMemo(() => {
    const emojiPool = ["🍜","🍣","🥗","🍔","🍕","🍚","🥟","🍳","🍲","🥩","🍤","🧀","🥐","🍢","🍙","🥞","🥪","🌮","🍱","🍛","🍝","🥘","🍖","🦐","🐟","🍗","🌭","🍟","🥨","🍩","🍰","🍦","🍪","🥐","🥯","🥖","🧇","🥞","🧆","🥙","🌯","🍝","🍤","🦞","🦀","🐙","🦑","🍥","🍡","🍧","🍨","🍮","🍯","🍫","🍬","🍭","🍮","🥮","🍯","🥫","🫕","🥗","🫒","🥑","🍆","🥔","🥕","🌽","🌶️","🥒","🥬","🥦","🧄","🧅","🍄","🥜","🌰","🍞","🥐","🥖","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🌭","🍕","🥪","🥙","🌮","🌯","🥗","🍝","🍜","🍲","🍛","🍣","🍤","🍱","🍘","🍙","🍚","🍢","🍡","🍧","🍨","🍦","🍰","🎂","🍮","🍭","🍬","🍫","🍩","🍪","🥠","🥮","🍯","🥛","☕","🍵","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧃","🧉","🧊","🥤","🧋","🧃"];
    return [0, 1, 2].map(() => {
      const items = [];
      for (let i = 0; i < 16; i++) {
        if (Math.random() < 0.3) {
          items.push({ __emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)] });
        } else {
          items.push(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
      items.push(items[0]); // 首尾相同，动画滚16行后无缝跳回
      return items;
    });
  }, [pool]);

  // ready 态：每列独立随机3行，行内互不重复（不泄露最终答案）
  const readyDisplay = useMemo(() => {
    return [0, 1, 2].map(() => {
      const used = new Set();
      const pick = () => {
        let d, t = 0;
        do { d = pool[Math.floor(Math.random() * pool.length)]; t++; }
        while (used.has(d.name) && t < 30);
        used.add(d.name);
        return d;
      };
      return [pick(), pick(), pick()];
    });
  }, [pool]);

  // 停住后每列固定3行，finalDish 在中间；上下行随机且6个上下行全局互不重复、不等于答案
  const stoppedDisplay = useMemo(() => {
    const used = new Set([finalDish.name]);
    const pick = () => {
      let d, t = 0;
      do { d = pool[Math.floor(Math.random() * pool.length)]; t++; }
      while (used.has(d.name) && t < 50);
      used.add(d.name);
      return d;
    };
    return [0, 1, 2].map(() => [pick(), finalDish, pick()]);
  }, [pool, finalDish]);

  // 开始摇：从静止态进入滚动
  const startSpin = () => {
    setPhase("spinning");
    setStoppedCols([false, false, false]);
  };

  // 依次停止：只在 spinning 阶段启动；第0列1.8s，第1列2.3s，第2列2.8s，停完0.7s揭晓
  useEffect(() => {
    if (phase !== "spinning") return;
    const timers = [];
    [0, 1, 2].forEach((col, i) => {
      timers.push(setTimeout(() => {
        setStoppedCols(s => { const n = [...s]; n[col] = true; return n; });
        if (i === 2) timers.push(setTimeout(onDone, 700));
      }, 1800 + i * 500));
    });
    return () => timers.forEach(clearTimeout);
  }, [phase, onDone]);

  // 跳过：立即停止所有列并揭晓
  const handleSkip = () => {
    setStoppedCols([true, true, true]);
    onDone();
  };

  return (
    <div className="slot-machine">
      <div className="slot-title">
        🎰 {mode === "blindbox" ? "盲盒摇出今天吃什么" : "为你摇出今天吃什么"}
      </div>
      <div className="slot-reels">
        {reels.map((reel, col) => {
          const items = phase === "ready" ? readyDisplay[col] : (stoppedCols[col] ? stoppedDisplay[col] : reel);
          return (
            <div className="slot-reel-wrap" key={col}>
              <div
                className={`slot-reel ${stoppedCols[col] ? "stopped" : ""}`}
                style={stoppedCols[col] ? undefined : {
                  animationDuration: `${1.2 + col * 0.35}s`,
                  animationDelay: `${-0.2 - col * 0.4}s`,
                }}
              >
                {items.map((dish, i) => (
                  <div className="slot-row" key={`${col}-${i}`} style={{ height: ROW_H }}>
                    {dish.__emoji ? (
                      <span className="slot-emoji" style={{ fontSize: 28 }}>{dish.__emoji}</span>
                    ) : (
                      <>
                        <span className="slot-emoji">{EMOJI_FOR(dish)}</span>
                        <span className="slot-name">{dish.name}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="slot-center-frame" aria-hidden="true"></div>
      </div>
      {phase === "ready" ? (
        <button type="button" className="slot-start" onClick={startSpin}>开始摇 🎰</button>
      ) : (
        <button type="button" className="slot-skip" onClick={handleSkip}>跳过 ⏭</button>
      )}
    </div>
  );
}
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
  const [slot, setSlot] = useState(null); // 老虎机状态 {pool, dish, meta, lightMode}，组件内部管 ready/spinning
  const [history, setHistory] = useState([]);
  const [llmCfg, setLlmCfg] = useState(loadLLMCfg); // BYOK，惰性读 localStorage
  const [showCfg, setShowCfg] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState(null); // {type: ok|fallback|warn|info, text}
  const avoidRef = useRef(null);

  // ===== H5 后退：流程 首页0→忌口1→轻食2→结果3 为线性栈 =====
  // 每条历史记录存 {step}；页面内返回按钮 / 安卓返回键 / iOS 侧滑都走浏览器 History，
  // popstate 时以历史记录为准回跳，返回上一步时保留已填的忌口与选择。
  useEffect(() => {
    if (!window.history.state) window.history.replaceState({ step: 0 }, "");
    const onPop = (e) => setStep(e.state?.step ?? 0);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // 前进一步并压栈
  const pushStep = (n) => {
    setStep(n);
    try { window.history.pushState({ step: n }, ""); } catch { setStep(n); }
  };
  // 页面内返回：回到上一条历史（即上一步）
  const backStep = () => {
    if ((window.history.state?.step ?? 0) > 0) window.history.back();
  };
  // 跨级回到指定步骤（用于结果为空时直接回忌口页）
  const gotoStep = (t) => {
    const d = window.history.state?.step ?? 0;
    if (t !== d) window.history.go(t - d);
  };

  // 背景「美食满天飞」：按视口均匀网格定位，每个食物只在原位轻柔浮动，
  // 不做穿屏移动，保证空间分布始终均匀；固定种子避免重渲染抖动。
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 430,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  }));
  useEffect(() => {
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => setVp({ w: window.innerWidth, h: window.innerHeight }), 150);
    };
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, []);
  const FOOD_FLOAT = useMemo(() => {
    const pool = ["🍜","🍣","🥗","🍔","🍕","🍚","🥟","🍳","🍦","🍰","🍱","🍞","🌮","🍪","🍩","🍲","🥩","🍤","🧀","🥐","🍢","🍙","🥞","🥪"];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const CELL = 155; // 目标网格间距(px)，按视口推算行列（移动优先，竖屏更饱满）
    const cols = Math.max(3, Math.round(vp.w / CELL));
    const rows = Math.max(4, Math.round(vp.h / CELL));
    const PAD_X = 7, PAD_Y = 6;                 // 四周内缩(%)，避免贴边
    const spanX = 100 - PAD_X * 2, spanY = 100 - PAD_Y * 2;
    const items = [];
    for (let r = 0; r < rows; r++) {
      const odd = r % 2 === 1;
      const n = odd ? cols + 1 : cols;         // 奇数行多一个并半格错位 → 斜向交错
      for (let c = 0; c < n; c++) {
        const jx = (rnd() - 0.5) * 0.10;
        const jy = (rnd() - 0.5) * 0.10;
        const gx = odd ? c / cols : (c + 0.5) / cols;
        items.push({
          emoji: pool[(r * (cols + 1) + c) % pool.length],
          left: PAD_X + gx * spanX + jx,
          top: PAD_Y + ((r + 0.5) / rows) * spanY + jy,
          size: 24 + rnd() * 16,
          dur: 8 + rnd() * 6,                  // 长周期，缓慢平静
          delay: -rnd() * 14,                  // 负延迟错开相位，不齐步走
          dx: 18 + rnd() * 26 + (rnd() - 0.5) * 16,    // 统一偏右
          dy: -(14 + rnd() * 22) + (rnd() - 0.5) * 12, // 统一偏上 → 斜向右上的"风"
          op: 0.15 + rnd() * 0.12,
          rot: (rnd() - 0.5) * 20,
        });
      }
    }
    return items;
  }, [vp.w, vp.h]);

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
    pushStep(1);
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
    pushStep(2);
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
    // 从候选池随机选一道（排除上一道）
    const available = exclude ? pool.filter(d => d.name !== exclude) : pool;
    const dish = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[0] || null;
    if (!dish) {
      // 候选池为空，直接显示空结果
      setResult({ dish: null, reason: "", ...meta });
      setSlot(null);
      pushStep(3);
      return;
    }
    setHistory(h => [...h, dish.name]);
    // 进入老虎机揭晓仪式（ready 静止态，使用者点「开始摇」才启动）
    setSlot({ pool, dish, meta, lightMode: lm });
    setResult(null);
    pushStep(3);
  }

  // 老虎机结束：揭晓结果卡（result 非空后老虎机自动隐藏）
  function finishSlot() {
    if (!slot?.dish) return;
    setResult({
      dish: slot.dish,
      reason: makeReason(slot.dish, slot.lightMode, ""),
      ...slot.meta,
    });
  }

  function reset() {
    setAvoid("");
    setQuickAvoid([]);
    setAvoidCats(null);
    setLightMode(false);
    setResult(null);
    setSlot(null);
    setHistory([]);
    setAiMsg(null);
    setAiBusy(false);
    // 一次性退回历史栈底（首页）；history.go 只在目标记录触发一次 popstate 落到 step0
    const d = window.history.state?.step ?? 0;
    if (d > 0) window.history.go(-d);
    else setStep(0);
  }

  function changeOne() {
    runDecision();
  }

  return (
    <>
      <div className="food-bg" aria-hidden="true">
        {FOOD_FLOAT.map((f, i) => (
          <span
            key={i}
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              fontSize: `${f.size}px`,
              animationDuration: `${f.dur}s`,
              animationDelay: `${f.delay}s`,
              "--dx": `${f.dx}px`,
              "--dy": `${f.dy}px`,
              "--op": f.op.toFixed(2),
              "--rot": `${f.rot}deg`,
            }}
          >{f.emoji}</span>
        ))}
      </div>
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
        {step >= 1 && (
          <div className="topbar">
            <button
              type="button"
              className="topbar-back"
              onClick={backStep}
              aria-label="返回上一步"
            >
              <span className="topbar-arrow" aria-hidden="true">‹</span>
              {step === 1 ? "返回首页" : step === 2 ? "返回修改忌口" : "返回上一步"}
            </button>
          </div>
        )}

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
            {slot && !result && (
              <SlotMachine
                pool={slot.pool}
                finalDish={slot.dish}
                mode={mode}
                onDone={finishSlot}
              />
            )}

            {result && result.dish && (
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

            {result && !result.dish && (
              <div className="empty">
                <div className="empty-emoji" aria-hidden="true">😅</div>
                <p>按当前忌口 / 轻食条件筛选后没有匹配的菜，试试减少几项忌口</p>
                <button className="confirm-btn" onClick={() => gotoStep(1)}>返回调整忌口</button>
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
        ⚠️ 本应用为娱乐决策工具，所有推荐和数据仅供参考，不构成任何医疗、营养、食品安全建议。
      </footer>
      </div>
    </>
  );
}
