# 🍜 吃什么 v2.3 — Handoff / 项目交接

> 生成时间: 2026-09-12
> 更新: 2026-09-12 · UI 优化版（首页卡片化 + 步骤指示器 + 结果页质感；UI 全面原生 CSS，esbuild 自动产出 app.css）
> 更新: 2026-09-12 · 菜品配图版（26 道菜逐一生成治愈系插画，结果页按菜名显示配图，无图回退 emoji）
> 更新: 2026-09-12 · 轻食扩展版（新增 8 道低卡菜，菜品库 34 道；轻食模式改为低卡池随机轮换，"换一个"不再永远同一道）
> 更新: 2026-09-12 · **忌口结构化版**（每道菜补 spicy/contain/veggie 三字段；Step1 改为 4 组 12 项分类点选 + 自由文本归一化；忌口为硬过滤绝不放宽；顺带修复"选轻食首推按随便吃跑"的 setState 闭包 bug）
> 更新: 2026-09-12 · **AI 感知层版（Agent）**（新增 src/llmParser.js：大模型理解任意自然语言忌口→白名单收敛→回填标签；BYOK 自带 Key 只存 localStorage；OpenAI 兼容协议；任何失败回退本地 parseAvoidText；结果页新增候选池透明提示）
> 用途: 提交支付宝涌现奖比赛 + GitHub 开源

---

## 🎯 项目定位

**"吃什么 · 饭点决策助手"** — 30 秒搞定午餐/晚餐选择。

## 📦 部署状态

| 平台 | 状态 | 地址 |
|------|------|------|
| 本地 dev | ✅ 跑通 | http://localhost:8095/ |
| GitHub | ✅ 已 push | https://github.com/firecangshu/chishenme |
| GitHub Pages | ⏳ 等 1-2 min | https://firecangshu.github.io/chishenme/ |
| ModelScope Studio | 📦 部署包就绪 | `C:\Users\User\Desktop\deploy_final` |

---

## 📂 目录结构

```
E:\5.吃什么——chishenme\
├── index.html / app.js / app.css    ← GitHub Pages 根（部署产物）
├── images\                          ← 26 张菜品配图 dish-01~26.jpg（部署产物）
├── chishenme-web\                   ← 源码工程
│   ├── src\
│   │   ├── main.jsx                 ← 仅 render App
│   │   ├── App.jsx                  ← 所有 UI 组件（改 UI 主文件；配图渲染在 dish-emoji）
│   │   ├── App.css                  ← 原生 CSS（.dish-img 配图样式 + .ai-* AI 区样式）
│   │   ├── data.js                  ← 34 道菜 + 结构化忌口 + decide 决策内核
│   │   └── llmParser.js             ← AI 感知层：LLM 忌口解析（BYOK / OpenAI 兼容 / 白名单收敛 / 降级）
│   ├── dist-final\                  ← 构建产物（3 文件 + images\）
│   └── package.json
├── 支付宝涌现奖_参赛包\              ← 比赛文档
└── HANDOFF.md                       ← 本文件
```

---

## 🛠 技术栈（已验证稳定）

| 层 | 选型 | 版本 | 备注 |
|----|------|------|------|
| React | react / react-dom | **18.3.1** | 稳定版 |
| UI | **原生 HTML/CSS** | — | 2026-09-12 UI 优化后不再依赖 Mantine 组件渲染；`@mantine/*`、`lucide-react` 依赖保留在 package.json 未删，但 esbuild 不再打包 |
| 图标 | emoji + 菜品插画 + 自绘 LOGO | — | 顶部 LOGO 为"馋嘴小女孩"插画（images/logo.jpg，备选 logo-alt.jpg）；结果页按菜名显示配图，加载失败回退 emoji |
| 打包 | **esbuild** | 最新 | 不用 Vite Rolldown！CSS 由 esbuild 自动产出；图片走相对路径字符串，不 import |
| 部署 | **纯静态 3 文件 + images/** | — | index.html + app.js + app.css + images\（26 张配图） |

---

## 🔨 改完代码怎么构建

```powershell
cd E:\5.吃什么——chishenme\chishenme-web

# 1. 打包（esbuild，1 秒出结果；CSS 由 esbuild 自动产出到 dist-final\app.css）
npx esbuild src/main.jsx --bundle --outfile=dist-final/app.js --format=esm --jsx=automatic --minify

# 2. 写 index.html（相对路径，见下文模板；dist-final\index.html 已就位则跳过）

# 3. 启动本地预览
cd dist-final
python -m http.server 8095
# 浏览器打开 http://localhost:8095/

# 4. 同步 images（配图目录，必须三处一致：dist-final / 根 / deploy_final）
New-Item -ItemType Directory -Force -Path ..\images | Out-Null
Copy-Item dist-final\images\* ..\images\ -Force

# 5. 推 GitHub（部署产物放仓库根目录）
Copy-Item dist-final\index.html ..\index.html -Force
Copy-Item dist-final\app.js ..\app.js -Force
Copy-Item dist-final\app.css ..\app.css -Force
cd ..
git add -A
git commit -m "feat: update UI"
git push
```

### index.html 模板（实际部署版含全局错误捕获层）

```html
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="./app.css">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🍜 今天到底吃什么呢？</title>
<style>#err{position:fixed;inset:0;background:#1a1a2e;color:#ff4757;padding:20px;font-family:monospace;white-space:pre-wrap;z-index:99999;display:none;font-size:13px;overflow:auto;}#err.show{display:block;}</style>
</head>
<body>
<div id="app"></div>
<div id="err"></div>
<script>
  var errEl = document.getElementById('err');
  window.addEventListener('error', function(e){ showErr('全局错误: '+e.message+'\n@ '+e.filename+':'+e.lineno+'\n\n'+(e.error?.stack||'')); });
  window.addEventListener('unhandledrejection', function(e){ showErr('Promise错误: '+e.reason?.message+'\n\n'+(e.reason?.stack||'')); });
  function showErr(m){ errEl.textContent=m; errEl.classList.add('show'); console.error(m); }
</script>
<script type="module" src="./app.js"></script>
</body>
</html>
```

---

## 🐛 踩过的坑（别再踩）

| # | 错误信息 | 根因 | 解法 |
|---|---------|------|------|
| 1 | `TypeError: 0 is not iterable` | App.jsx 少写 `useState()` → `const [step, setStep] = 0` | 必须 `useState(0)` |
| 2 | `render is not a function` | Mantine v9 内嵌独立 React 副本，esbuild 打出两份 | 锁定 Mantine v7 |
| 3 | `r is not a function` | Mantine v9 + React 18 API 不兼容 | `npm install @mantine/core@7 @mantine/hooks@7` |
| 4 | React 18 vs 19 Context render | v9 用了 React 19 新 API | 锁死 `react@18 react-dom@18` |
| 5 | Vite 8 Rolldown 打包异常 | Rolldown 还不成熟，TypeScript 类型检查 + Rolldown 链路有问题 | **换 esbuild 直接 bundle** |
| 6 | GitHub Pages 白板 | 构建产物上传时机 + 浏览器缓存 | 构建后等 1-2 分钟，Ctrl+Shift+R 强刷 |
| 7 | 绝对路径 `/assets/` 404 | Pages 子路径部署 | Vite 加 `base: './'` 或手动改路径 |
| 8 | 白板无报错 | ESM `<script type="module">` 错误静默 | 动态 `import()` 才能 catch 到 |

---

## 📄 3 步业务流程

```
Step 0 首页
  ├── 大按钮 [🍽️ 吃啥？] → 进入推荐模式
  ├── 大按钮 [🎲 摇一个] → 进入盲盒模式
  └── 快捷 chips（中午吃啥 / 来个盲盒 / 我不吃辣）

Step 1 忌口调查（结构化，2026-09-12 改版）
  ├── 分类点选（4 组 12 项，可多选，每项彼此独立）：
  │     口味=忌辣 / 肉类=猪牛羊鸡
  │     过敏原=海鲜水产·花生·乳制品·鸡蛋·大豆·麸质面食（海鲜与花生是两个独立忌口项）
  │     饮食=全素
  ├── Input 自由文本补充，两条识别通道：
  │     ① [🤖 AI 智能识别] parseAvoidByLLM 调大模型理解任意口语（BYOK，见下章）
  │     ② 本地 parseAvoidText 同义词归一化（离线兜底，如"不吃牛肉花生辣"）
  │     AI 结果回填 chips，人在回路可点掉；AI 失败自动走 ②
  └── 点选 + 文本 mergeAvoidCats 合并 → avoidCats {spicy,veggie,tags[]} → 确认

忌口确定后的决策链（针对性提交 + 随机分配）：
  getCandidatePool(avoidCats,lightMode) 从 34 道素材库剔除含忌口材料的菜 → 候选池
  → decide 只在候选池内 pickRandom/pickTop；结果页 pool-hint 展示
  「已按 N 项忌口，从 34 道中剔除后剩 M 道，随机为你挑中这道」（UI 与决策共用同一池口径）

Step 2 轻食选择
  ├── [💡 要轻食] → 从 ≤500kcal 低卡池随机推荐（"换一个"会轮换不同菜）
  └── [🍽️ 随便吃] → 不过滤热量

Step 3 推荐结果
  └── Card 卡片：配图（images/dish-XX.jpg，无图回退 emoji）+ 菜名 + Badge（热量/地域/时间/价格）+ 推荐理由
  ├── [🔄 换一个] → 重新决策
  └── [❌ 换顿再说] → 回到 Step 0
```

---

## 🧬 忌口结构化体系（2026-09-12，改菜库前必读）

每道菜三个结构化字段（旧的自由文本 `avoid` 字段已废弃）：

| 字段 | 类型 | 取值 |
|------|------|------|
| `spicy` | number | 0=不辣 / 1=微辣 / 2=辣（忌辣即过滤 spicy>0） |
| `contain` | string[] | 成分标签，命名空间固定：肉类=猪肉/牛肉/羊肉/鸡肉/鱼/虾；过敏原=花生/海鲜/乳制品/鸡蛋/大豆/麸质/生食/坚果 |
| `veggie` | boolean | true=素食（无肉无鱼虾，蛋奶素算素） |

关键函数（都在 data.js，纯函数可直接 node 单测）：

- `AVOID_CATEGORIES`：Step1 分类点选的唯一数据源（key=spicy/veggie 特殊开关，tag=contain 标签）
- `parseAvoidText(text)`：自由文本 → `{spicy,veggie,tags[]}`，同义词词典 `SYNONYM_RULES`；**单字"牛/羊/鸡"已故意移除**（会误伤"牛奶/鸡蛋"），要用"牛肉/鸡肉"等词
- `mergeAvoidCats(a,b)`：合并点选与文本两路结果
- `filterRestrictions(dishes,cats)`：结构化硬过滤
- `decide({avoidCats,lightMode,mode,exclude})`：**忌口硬过滤绝不放宽**（过敏安全）；过滤空了返回 null 由 UI 提示"返回调整忌口"；只有热量（轻食）层允许放宽兜底

**加菜必须同时补**：spicy / contain / veggie + DISH_IMAGE_MAP + 对应插画，缺字段会被筛选器漏判。

历史 bug 修复：`confirmLight` 里 `setLightMode(want)` 后同步调 `runDecision()` 会读到闭包旧值 false，导致轻食首推按"随便吃"跑。现 `runDecision(lightOverride)` 显式传值；注意空态按钮的 onClick 会传入事件对象，函数内用 `typeof === 'boolean'` 守卫。

---

## 🤖 AI 大模型感知层（2026-09-12，Agent 架构，改前必读）

**分层职责（这是"智能体"的核心设计，别混层）**：

```
自然语言忌口文本
  → 感知层 llmParser.js：大模型只负责"理解"，输出 {spicy,veggie,tags[],unknown[]}
  → 收敛层 sanitizeAvoid：tags 强制过 LEGAL_TAGS 白名单（=AVOID_CATEGORIES 全部 tag），
                          白名单外的词进 unknown 只提示、不进决策；布尔/数组脏数据归一
  → 决策层 data.js：getCandidatePool 硬剔除 + decide 随机（规则引擎，确定性、可复算）
  → 人在回路：AI 结果只是自动勾选 chips，用户可点掉再确认
```

**为什么 BYOK（自带 Key）而不是写死 Key**：本站纯静态托管（GitHub Pages/ModelScope Static），前端代码对所有人可见，写死作者 Key 等于公开泄露。因此 Key 由用户在「AI 设置」里填一次，只存 `localStorage(csm_llm_cfg_v1)`，随请求直发模型厂商，不经过任何第三方。

**UI 形态（2026-09-13 定稿）**：接入面板**默认折叠**，折叠按钮即入口——未接入显示「🔑 接入我的大模型」，已接入变绿显示「✅ 大模型已接入 · 点击修改」；展开后含 4 个厂商一键预设（DeepSeek/通义千问/Kimi/本地 Ollama，点一下自动填 baseURL+model，使用者只贴 Key）、三个带 label 字段（接口地址/模型名称/API Key）、「保存并接入」。本地端点（localhost/127.0.0.1）免 Key，由 `isLocalEndpoint` 判定、`isLLMReady(cfg)` 统一判断是否可调用。

**llmParser.js 导出**：
- `DEFAULT_LLM_CFG`：默认 DeepSeek（`https://api.deepseek.com/v1` + `deepseek-chat`），用户可改成任何 OpenAI 兼容端点（通义 dashscope/compatible-mode/v1、Moonshot、本地 Ollama）
- `isLocalEndpoint/isLLMReady`：本地端点免 Key；就绪 = 有 baseURL 且（有 Key 或本地端点）
- `buildSystemPrompt()`：系统提示词，内含标签白名单、映射示例、unknown 规则、few-shot；**改标签命名空间后这里自动跟随 LEGAL_TAGS**
- `extractJson(text)`：剥离 ```json 围栏、截取首个 `{` 到末个 `}`，容忍模型啰嗦
- `sanitizeAvoid(obj)`：白名单收敛 + 脏数据归一（已过 6 类离线用例）
- `parseAvoidByLLM(text,cfg)`：POST `{baseURL}/chat/completions`，Bearer 鉴权，temperature:0，错误带 code（NO_KEY/NO_BASE/NETWORK/HTTP/BAD_JSON）
- `loadLLMCfg/saveLLMCfg`：localStorage 读写

**铁律**：
1. 模型只做理解，**绝不允许直接决定推哪道菜**；决策必须走 data.js 规则引擎，保证过敏原硬过滤不被模型绕过。
2. tags 白名单之外一律不进决策（如模型返回"高嘌呤"，进 unknown 提示"暂不支持筛选"）。
3. 任何 AI 失败必须回退本地 parseAvoidText，流程不能断（已实测网络失败降级）。
4. 无 Key 时自动展开「AI 设置」并引导，不报错白屏。
5. 真实端到端调用需用户自备 Key；无 Key 环境用劫持 `window.fetch` 返回 mock choices 的方式验证回填链路（已验证：成功回填/unknown 提示/失败降级/无 Key 引导四条路径，控制台 0 报错）。

---

## 🎨 当前 UI 主题

```javascript
// src/main.jsx
import { MantineProvider, createTheme } from '@mantine/core'

const theme = createTheme({
  primaryColor: 'orange',        // 主色 #FF6B35
  fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  defaultRadius: 'md',
  headings: { fontFamily: '同 body' },
})

// 包裹方式
<MantineProvider theme={theme}>
  <App />
</MantineProvider>
```

### 改主题 → 改 `createTheme` 参数

| 想改什么 | 参数 | 可选值 |
|---------|------|--------|
| 主色 | `primaryColor` | orange / grape / blue / green / pink ... |
| 圆角 | `defaultRadius` | xs / sm / md / lg / xl |
| 字体 | `fontFamily` | 任意字体字符串 |
| 暗色模式 | `colorScheme` | 'light' / 'dark' |

### 改组件样式 → App.jsx 里用 `styles` / `classNames` prop

```jsx
<Button
  size="xl"
  styles={{ root: { width: 200, height: 56 } }}
>
  吃啥？
</Button>
```

### 全局覆盖 → `src/App.css`（Mantine CSS 之后加载）

```css
/* 自定义样式放在这里，会覆盖 Mantine 默认 */
.header h1 {
  font-size: 40px;
  background: linear-gradient(135deg, #FF6B35, #FF9F43);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 🚫 别碰的东西

| 禁项 | 原因 |
|------|------|
| 别升级 Mantine 到 v9 | 会崩（React 副本 + API 不兼容） |
| 别升级 React 到 19 | Mantine v7 不支持 |
| 别用 Vite 8 Rolldown 打包 | esbuild 稳多了 |
| 别删 data.js 里的 EMOJI_MAP | `EMOJI_FOR(dish)` 函数依赖（配图加载失败时回退） |
| 别删 data.js 里的 DISH_IMAGE_MAP | 菜名→图片文件名映射；加菜须同步加图 + 映射 |
| 别在 contain 里自造标签 | 标签必须用命名空间内的规范词，否则筛选器匹配不到；新增类别先改 AVOID_CATEGORIES 和 SYNONYM_RULES |
| 别让忌口兜底放宽过敏原 | decide 里只允许放宽热量，结构化忌口必须硬过滤（食品安全） |
| 别让大模型直接决定推菜 / 绕过白名单 | 模型只输出结构化忌口且 tags 必须过 LEGAL_TAGS；决策永远走 data.js，unknown 只提示不进池 |
| 别把任何 API Key 写进前端代码/提交到 git | 纯静态站代码公开可见，Key 只能 BYOK 存用户 localStorage |
| 别用 `import img from` 引图片 | esbuild 命令行不处理图片资源；配图走相对路径字符串 `images/xxx.jpg` |
| 别改 index.html 里的 `<script type="module">` | esbuild bundle 产物必须用 module 模式 |

---

## 📝 ModelScope 部署步骤

1. 登录 https://www.modelscope.cn/studios/firecangshu/TastePick
2. 左侧 → **空间文件** → 删除所有旧文件
3. 上传 `C:\Users\User\Desktop\deploy_final` 里的内容：
   - `index.html`
   - `app.js`
   - `app.css`
   - `images\`（26 张配图，整目录上传）
4. 左侧 → **部署设置** → 选 **Static**（不是 Gradio/Streamlit）
5. 确认 → **确认并部署**
6. 等待 30-60 秒 → 获取访问 URL

---

## 🔧 快速调试命令

```powershell
# 本地启动
cd E:\5.吃什么——chishenme\chishenme-web\dist-final
python -m http.server 8095

# 重新打包
cd ..
npx esbuild src/main.jsx --bundle --outfile=dist-final/app.js --format=esm --jsx=automatic --minify

# 非 minify（调试用，看错误 stack trace）
npx esbuild src/main.jsx --bundle --outfile=dist-final/app.js --format=esm --jsx=automatic

# 看 Mantine 可用组件
node -e "console.log(Object.keys(require('@mantine/core')).sort().join('\n'))"

# 推 GitHub（含部署产物）
cd E:\5.吃什么——chishenme
Copy-Item chishenme-web\dist-final\index.html . -Force
Copy-Item chishenme-web\dist-final\app.js . -Force
Copy-Item chishenme-web\dist-final\app.css . -Force
git add -A; git commit -m "feat: update"; git push
```

---

## 🔌 依赖完整列表

```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "@mantine/core": "7.x",
  "@mantine/hooks": "7.x",
  "@mantine/notifications": "7.x",
  "lucide-react": "*",
  "clsx": "*"
}
```

---

**交接完毕。随时开干。** 🚀
