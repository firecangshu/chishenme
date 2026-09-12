# 老虎机（三连）SVG 拼装规范（slot-svg）

本文件是 agent 在 E 型盲盒路径下**运行时按候选池动态拼出老虎机 SVG**的"抄写规范"。
目标：零 JS 库、零 API、零托管；动画只做表现层；中奖项永远由硬过滤候选池算出。
跨平台兼容：WorkBuddy 用 `show_widget` 渲染带错峰滚动动画的 SVG；其他对话框降级为静态 SVG（终态已烤入）或纯文字揭晓。
（替代原 wheel-svg.md：转盘 → 老虎机三连）

## 1. 画布与转轮窗口

固定画布（与窗口数无关）：

```
viewBox = "0 0 680 330"
CELL    = 70           # 单个符号格高（小巧）
WT      = 70           # 转轮窗口顶部 y
WH      = 210          # 窗口高（显示 3 格）
PAYLINE = WT + WH/2 = 175   # 中奖线（窗口竖直中心）
REEL_W  = 130          # 单转轮宽（紧凑）
GAP     = 20
REEL_X  = [125, 275, 425]   # 三个转轮窗口 x（居中：(680-3*130-2*20)/2 = 125）
```
每个转轮一个 `<clipPath>` 圆角矩形窗口，内部放一个 `<g class="reel">` 竖直符号条，动画只对 reel 组做 `translateY`。

## 2. 符号条（strip）

```
strip = shuffle(pool) 重复至长度 L ≥ 24      # 保证上下都有余量做滚动
winnerCell = strip.index(winner)            # 中奖项在条中的位置（置于中段，距首尾 ≥ 8 格）
```
每个符号 = 自绘矢量图标 + 菜名（取自 `pool`）。**配图一律用自绘 inline SVG 图标（viewBox `0 0 48 48`，统一圆角描边 `#4A3B35` + 食物本色），按菜名从 `ICONS` 库取**——这是正式素材，禁止用系统 emoji 当主视觉（emoji 是字体字形，跨平台渲染不一致、颜色不可控、无法纳入调色板，详见 §4）。符号 i 占用 `y ∈ [WT + i*CELL, WT + (i+1)*CELL]`，中心 `WT + (i+0.5)*CELL`；图标置于格内上方、菜名置于下方（`#6B5B4E` / 14px / 700）。
三个转轮各自独立打乱，但**都含 `winner`**；最终三轮都停在中奖项上（三连 jackpot）。

## 3. 停止偏移公式（winnerCell → 终态 translateY）★关键

设中奖项在条中的索引 `c = winnerCell`，其（无位移）中心 `yc = WT + (c + 0.5) * CELL`。
要求停在 payline：

```
finalTy = PAYLINE - yc
        = 175 - (70 + (c + 0.5) * 70)
        = 105 - (c + 0.5) * 70
```
动画：translateY 从 `finalTy + SPIN_PX` 滚到 `finalTy`（向上滚动 `SPIN_PX` 后停中奖项）；`SPIN_PX = loops * CELL * K`（loops∈[4,7] 随机，K 取若干格，且保证 `SPIN_PX ≤ c*CELL` 且 `SPIN_PX ≤ (L-1-c)*CELL`，即滚动全程不露白）。因 `finalTy` 已精确使中奖项居中，动画只是叠加 CELL 整数倍的位移，**永不**使其偏离 payline。

**恒成立证明**：任意 `translateY = finalTy + k*CELL`（k 为整数）都让中奖项中心落在 `yc + finalTy + k*CELL = PAYLINE + k*CELL`；只有 `k=0` 时在 payline，其余时刻显示的是相邻符号（仍在 `pool` 内）。终点 `k=0` → 中奖项命中 payline。对任意 `c` 均成立。

**验算示例**（L=24，winnerCell=12）：`finalTy = 105 - 12.5*70 = -770`；中奖项中心 = `70 + 12.5*70 + (-770) = 175 = PAYLINE` ✓。三轮各自同法，均停中奖项 → 三连。

## 4. 动画 CSS（仅支持 widget 的客户端生效）

**配图素材标准（贯穿全规范）**：转轮里每道菜的图标必须是**自绘矢量 SVG**，不是 emoji。统一语言：圆角描边 `#4A3B35`、食物本色（红汤 `#E23744` / 绿菜 `#7CB342` / 黄面 `#FFD97D` 等）、浅色卡片底用 `MACARON` 调色板（见 §2）按菜名稳定分配同色。这样图标与整体马卡龙视觉"融入"成一套素材，而非贴上去的字形。emoji 仅允许出现在页眉/页脚装饰与纯文本兜底（§6）。

```
<style>
  @keyframes reelSpin { from { transform: translateY(var(--from)); }
                         to   { transform: translateY(var(--to));   } }
  .reel { transform-box: fill-box; transform-origin: center;
          animation: reelSpin 3.2s cubic-bezier(.16,.84,.3,1) forwards; }
  .reel.r2 { animation-delay: .5s; }   /* 错峰：轮2 晚停 */
  .reel.r3 { animation-delay: 1.0s; }   /* 轮3 最晚停，经典手感 */
</style>
<g class="reel r1" clip-path="url(#clip1)"> ...符号条... </g>
```
- `--from = finalTy + SPIN_PX`，`--to = finalTy`（滚动向上后停在 winner）。
- 降级平台忽略 `<style>`/动画，直接看 `transform` 属性或纯文字。
- 三个转轮用 `animation-delay` 错峰停止（轮1 先停、轮3 最后停）。

## 5. 两阶段渲染

| 阶段 | 内容 | WorkBuddy | 其他对话框 |
|---|---|---|---|
| **盲 BLIND** | 转轮滚动中 + 悬念文案「摇奖中…」 | 发文本 + 可选静态滚动帧 | 仅悬念文案（或字符画） |
| **开 OPEN** | 结果文字 + 三轮停在中奖项的开盘 SVG + 再摇提示 | `show_widget` 渲染带错峰滚动动画的开盘 SVG | 结果文字 + 静态开盘 SVG（终态已烤入）或仅文字 |

一轮回复里先输出「盲」再输出「开」；动画播放即提供"转→停"的盲盒仪式感。文字结果始终随「开」阶段给出，是答案唯一真相源。

## 6. 纯文本转轮兜底（不渲染 SVG 的平台，如微信小微）

当客户端既不渲染 widget 也不渲染 SVG 时，用**纯文本转轮**兜底，盲盒体验仍成立（悬念文案 → 结果揭晓）。零格式依赖，任何对话框都能显示。

**盲阶段**：只发悬念，不列候选：
```
🎰 摇奖中…
```
**开阶段**：三轮同显中奖项 emoji + 中奖项高亮 + 结果文字：
```
🎰 摇奖中…
〔🍲〕〔🍲〕〔🍲〕
🎉 开！→ 麻辣烫 🔥
```
- 中奖项在字符画里用 `🎉 开！→` 标出，并在下方单独一行给出**文字真相源**（最重要，保证任何平台答案都对）。
- 若平台会吃掉框线/emoji，直接退化为纯列表 + "🎉 开！→ 麻辣烫"，答案不变。

**生成规则**（agent 运行时拼）：
```
emoji_of(item) = item 对应 emoji（取自 menu-data 或约定映射）
build_text_slot(pool, w):
    e = emoji_of(pool[w])
    return f"〔{e}〕〔{e}〕〔{e}〕\n🎉 开！→ {pool[w].name}"
```

## 7. 启动引导（可交互 HTML demo 必备）

老虎机若以**可交互页面（DOM/HTML）**呈现，必须提供明确的"如何启动"引导——否则用户不知道怎么开摇（拉杆红球不像按钮，需显式提示）。

**参考实现（已定稿，可直接复用）**：

- **启动提示气泡 `.lever-hint`**：红底白字，文案**「点我开始」**（简洁、不堆 emoji）。贴在拉杆红球**右下方、紧邻圆球**，与红球留极小间隙。
- 气泡**顶部一个朝上小箭头**指向红球（圆点是拉杆手柄的可点部位）——箭头方向必须等于"指向圆球"，不是朝左/朝右。
- 气泡轻微浮动（`hintbob` 1s 循环）吸引注意；红球 `.knob` 加 `:hover` 放大(1.14)/`:active` 缩小(.92) 过渡，强化"可点"观感。
- **三种启动方式都通**：①点提示气泡 ②点拉杆杆身/红球 ③拖下拉杆（经典手感）。点击触发 `autoPull()`：手柄自动下拉回弹后 `spin()`；`spin()` 开头用 `spinning` 布尔锁防重入（重复点击不叠加）。
- **开过一次后气泡自动消失**（`spin()` 开头 `hint.style.display='none'`），避免反复晃动挡视线。

> 注：纯 SVG widget（`show_widget` 渲染的终态/动画 SVG）与纯文本兜底（§6）无交互，不需要此引导；本 § 仅用于独立可交互 HTML demo。正式 skill 的"开"阶段若产出可点击 HTML，按此 § 套用即可。

## 附录：完整 SVG 模板（开阶段 · 三连 jackpot，winner=麻辣烫）

每个转轮窗口内是一个竖直符号条 `<g class="reel">`，动画只对该 g 做 `translateY`。
终态 `translateY = finalTy`（见 §3）。下列为「开」阶段、三轮已停、winner 落在 payline 的静态呈现；
真实运行时 winner 在各自转轮的中段（距首尾 ≥ 8 格），通过 `finalTy` 滚到 payline。

配色：机身浅粉 `#FFF6FB` + 柔粉描边 `#F4B8CE`；转轮窗口白底柔粉边；中奖格柔和金 `#FFF0B3` + `#F4C95D` 描边；卡片底用马卡龙色板 `#FFB3C1 / #A8E6CF / #A0C4FF / #FFD97D / #D5AAFF / #FFC896 / #FF9F9F / #9FE8E0`（按菜名稳定分配同色，跨轮一致）。**每个单元格的图标用自绘 inline SVG（`<svg class="ic" viewBox="0 0 48 48">` + 统一描边 `#4A3B35` + 食物本色），不用 emoji**；菜名 `#6B5B4E` / 14px / 700，置于图标下方。圆角放大（rx 14–28）显可爱。下方模板以「拉面」等格示范矢量图标写法，其余单元格同理替换 emoji。

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 330" width="340" height="200">
  <rect x="0" y="0" width="680" height="330" fill="#FFF6FB"/>
  <text x="340" y="34" text-anchor="middle" font-size="18" font-weight="600" fill="#C98AA0">🎰 盲盒老虎机 · 开</text>
  <rect x="110" y="48" width="460" height="262" rx="28" fill="#FFF6FB" stroke="#F4B8CE" stroke-width="5"/>
  <!-- 转轮窗口 -->
  <rect x="125" y="70" width="130" height="210" rx="18" fill="#ffffff" stroke="#F4C9D8" stroke-width="2"/>
  <rect x="275" y="70" width="130" height="210" rx="18" fill="#ffffff" stroke="#F4C9D8" stroke-width="2"/>
  <rect x="425" y="70" width="130" height="210" rx="18" fill="#ffffff" stroke="#F4C9D8" stroke-width="2"/>
  <!-- payline 高亮（不随转轮滚动） -->
  <rect x="105" y="168" width="470" height="14" fill="#F4B8CE" opacity="0.35"/>
  <!-- 轮1 -->
  <rect x="129" y="74" width="122" height="62" rx="14" fill="#FFB3C1"/>
  <svg x="171" y="80" width="38" height="38" viewBox="0 0 48 48"><path d='M9 25 H39 V28 A15 13 0 0 1 9 28 Z' fill='#FFFFFF' stroke='#4A3B35' stroke-width='2'/><path d='M13 23 q4 -7 8 0 t8 0 t8 0' fill='none' stroke='#4A3B35' stroke-width='2'/><path d='M16 13 q3 -4 0 -8 M24 13 q3 -4 0 -8 M32 13 q3 -4 0 -8' fill='none' stroke='#4A3B35' stroke-width='1.5'/></svg>
  <text x="190" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">拉面</text>
  <rect x="129" y="144" width="122" height="62" rx="14" fill="#FFF0B3" stroke="#F4C95D" stroke-width="2"/>
  <svg x="171" y="150" width="38" height="38" viewBox="0 0 48 48"><path d='M11 22 H37 V29 A13 9 0 0 1 11 29 Z' fill='#E23744' stroke='#4A3B35' stroke-width='2'/><path d='M11 22 H37' stroke='#4A3B35' stroke-width='2'/><path d='M24 8 l3 7 3 -7 z' fill='#F4743B' stroke='#4A3B35' stroke-width='1.5'/></svg>
  <text x="190" y="202" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">麻辣烫</text>
  <rect x="129" y="214" width="122" height="62" rx="14" fill="#A8E6CF"/>
  <svg x="171" y="220" width="38" height="38" viewBox="0 0 48 48"><path d='M10 25 H38 V29 A14 10 0 0 1 10 29 Z' fill='#F5E9DC' stroke='#4A3B35' stroke-width='2'/><ellipse cx='20' cy='22' rx='3' ry='2' fill='#FFFFFF' stroke='#4A3B35' stroke-width='1'/><ellipse cx='28' cy='21' rx='3' ry='2' fill='#FFFFFF' stroke='#4A3B35' stroke-width='1'/><ellipse cx='24' cy='24' rx='3' ry='2' fill='#FFFFFF' stroke='#4A3B35' stroke-width='1'/></svg>
  <text x="190" y="272" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">炒饭</text>
  <!-- 轮2 -->
  <rect x="279" y="74" width="122" height="62" rx="14" fill="#A0C4FF"/>
  <svg x="321" y="80" width="38" height="38" viewBox="0 0 48 48"><path d='M12 32 Q14 14 30 14 Q40 14 38 24 Q36 32 26 30 Q18 28 20 22' fill='none' stroke='#F4743B' stroke-width='3'/><path d='M12 32 l-3 3' stroke='#4A3B35' stroke-width='2'/></svg>
  <text x="340" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">炸虾</text>
  <rect x="279" y="144" width="122" height="62" rx="14" fill="#FFF0B3" stroke="#F4C95D" stroke-width="2"/>
  <svg x="321" y="150" width="38" height="38" viewBox="0 0 48 48"><path d='M11 22 H37 V29 A13 9 0 0 1 11 29 Z' fill='#E23744' stroke='#4A3B35' stroke-width='2'/><path d='M11 22 H37' stroke='#4A3B35' stroke-width='2'/><path d='M24 8 l3 7 3 -7 z' fill='#F4743B' stroke='#4A3B35' stroke-width='1.5'/></svg>
  <text x="340" y="202" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">麻辣烫</text>
  <rect x="279" y="214" width="122" height="62" rx="14" fill="#FFD97D"/>
  <svg x="321" y="220" width="38" height="38" viewBox="0 0 48 48"><path d='M12 30 Q12 16 24 16 Q36 16 36 30 Z' fill='#E8B06B' stroke='#4A3B35' stroke-width='2'/><path d='M18 20 v8 M24 18 v10 M30 20 v8' stroke='#4A3B35' stroke-width='1.4'/></svg>
  <text x="340" y="272" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">面包</text>
  <!-- 轮3 -->
  <rect x="429" y="74" width="122" height="62" rx="14" fill="#D5AAFF"/>
  <svg x="471" y="80" width="38" height="38" viewBox="0 0 48 48"><ellipse cx='24' cy='32' rx='16' ry='5' fill='#FFFFFF' stroke='#4A3B35' stroke-width='2'/><path d='M14 30 Q24 12 34 30 Z' fill='#FFD97D' stroke='#4A3B35' stroke-width='2'/></svg>
  <text x="490" y="132" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">咖喱饭</text>
  <rect x="429" y="144" width="122" height="62" rx="14" fill="#FFF0B3" stroke="#F4C95D" stroke-width="2"/>
  <svg x="471" y="150" width="38" height="38" viewBox="0 0 48 48"><path d='M11 22 H37 V29 A13 9 0 0 1 11 29 Z' fill='#E23744' stroke='#4A3B35' stroke-width='2'/><path d='M11 22 H37' stroke='#4A3B35' stroke-width='2'/><path d='M24 8 l3 7 3 -7 z' fill='#F4743B' stroke='#4A3B35' stroke-width='1.5'/></svg>
  <text x="490" y="202" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">麻辣烫</text>
  <rect x="429" y="214" width="122" height="62" rx="14" fill="#FFC896"/>
  <svg x="471" y="220" width="38" height="38" viewBox="0 0 48 48"><path d='M24 9 L38 35 H10 Z' fill='#FFFFFF' stroke='#4A3B35' stroke-width='2'/><rect x='17' y='29' width='14' height='6' rx='1' fill='#4A3B35'/></svg>
  <text x="490" y="272" text-anchor="middle" font-size="14" font-weight="700" fill="#6B5B4E">饭团</text>
</svg>
```
- 中奖格(金)中心 y=175 = PAYLINE，与 §3 公式 `finalTy = 105 - (c+0.5)*70` 一致：把整条 `translateY` 设为 `finalTy` 即停在此。
- 动画版：把每个 `<g class="reel">` 内容包成可平移组，`translateY` 从 `finalTy + SPIN_PX` 滚到 `finalTy`，轮2/轮3 用 `animation-delay` 错峰。
- 降级平台：直接输出上图静态 SVG（`finalTy` 已烤入，中奖项即在 payline）；或退化为纯文字转轮（§6）。
- 盲阶段：同上但不输出中奖菜名、转轮停在滚动中途帧（答案只在「开」阶段文字给出）。
