# 决策引擎伪代码（references/logic.md）

本文件供 WorkBuddy 在执行「吃什么」skill 时按需加载，描述从输入到输出的决策流程。"引擎"由 LLM 读取本文件与 SKILL.md 后按指令执行，无需独立程序。

## 主流程

```text
function decide(raw_input):
    motiv = classify_motivation(raw_input)        # A/E/B/C/D(+D1..D4)
    if is_weak_and_ambiguous(raw_input): confirm("是说吃饭的事？")
    if motiv not in (A, E):                        # A/E 跳过追问
        ctx = ask_constraints_one_round()          # 场景/预算/时间/忌口
    pool = hard_filter(menu, ctx, motiv)           # 安全红线；多人取 avoid 并集
    if pool empty: pool = relax_progressively(ctx) # 兜底5
    switch motiv:
        A: return default_top1(pool) + reason       # 秒决
        E: return blind_box_slot(pool)             # 遮答案→三转轮→揭晓
        B: return top3(pool, epsilon=0.5)           # 高探索
        C: return top3(pool, weight=comfort_tag)    # 慰藉食+共情语气
        D: return handle_social(pool, subtype)      # D1..D4 见下
    after_eat: rating = ask_rating(); update_profile(user_id, item, rating)
```text

## 多人社交处理

```text
handle_social(pool, subtype):
    D1 双人: 中等价位、易分享、不奇葩
    D2 情侣: 重 环境/氛围/可拍照 标签，分量适中偏精致
    D3 商务: 升预算、优先 招牌/体面 标签、提示"确认主宾忌口"
    D4 多人: 最大公约数 + avoid 并集排除，或转投票
```text

## 探索-利用（EE）防腻

以概率 ε(≈0.2) 从 pool 抽取"未吃过/低频次"项作为惊喜；其余按用户画像匹配已知喜好。
情绪型(C)/尝鲜型(B) 调高 ε：C 偏向 comfort 标签，B 的 ε 提到 ≈0.5。

## 去重

24 小时内不重复推荐同一 `item_id`；优先推未吃过或低频次项。

## 硬过滤 hard_filter(menu, ctx, motiv)

1. 忌口：单人按自身 `avoid`；多人按所有参与者 `avoid` 的**并集**，任一人忌口项全排除。
2. 时间：`time ≤ ctx.time`。
3. 预算：`price ≤ ctx.budget`。
4. 场景：`scene` 命中 `ctx.scene`（如夜宵只留带"夜宵"项）。

## 兜底 relax_progressively(ctx)

过滤后为 0：

1. 先放宽预算（+50% 或取库内最高价档）。
2. 再放宽场景（允许相邻场景，如午→晚）。
3. 每次放宽都向用户说明"已帮你放宽了约束"。

## 盲盒老虎机 blind_box_slot(pool, session_spun, re_spin)

E 型专用。两阶段揭晓：先"盲"（不显中奖），再"开"（三转轮停稳，中奖项落在 payline）。中奖项与动画解耦，动画停点完全由 `finalTy` 停止偏移数学决定（见 references/slot-svg.md §4）。

```text
function blind_box_slot(pool, session_spun, re_spin):
    N = len(pool)
    if N == 0:
        return relax_progressively(ctx)            # 兜底5，理论上 pool 已非空
    if N == 1:
        return open_reveal(pool[0])                 # 仅 1 项直接揭晓，不转轮

    # 增变化：排除本次会话已摇过的项
    candidates = [x for x in pool if x.id not in session_spun]
    if not candidates:
        candidates = pool                          # 排除后为空则回退全池

    # 再摇上限：第 4 次锁定上一次结果
    if re_spin >= 3:
        return lock_last(session_spun)             # "这个吧，别纠结了"（兜底4）

    winner = random.choice(candidates)
    session_spun.add(winner.id)                     # 记录，供后续再摇去重

    svg_blind = build_slot_blind(pool)             # 三轮盖"?"，不显中奖
    svg_open  = build_slot_open(pool, winner)       # 三转轮停稳，中奖项落 payline
    text_slot = build_text_slot(pool, winner)       # 纯文本字符画转轮（兜底，见 slot-svg.md §7）
    return { phase:"blind", svg:svg_blind, count:N },
           { phase:"open",  svg:svg_open, text_slot:text_slot, winner:winner,
             text: reveal_text(winner), re_spin_left: 3 - re_spin }
```text

`build_slot_open(pool, winner)` 内部按 slot-svg.md §4 计算：

```text
strip = shuffle(pool) 重复拼接至 L ≥ 24          # 符号条
winnerCell = strip.index(winner)                  # 中奖项在符号条中的序号（0-based）
yc = 90 + (winnerCell + 0.5) * 110                # 单元中心 y，CELL=110
PAYLINE = 255
finalTy = PAYLINE - yc = 165 - (winnerCell + 0.5) * 110   # 转轮最终 translateY
```text
动画：三转轮 `translateY` 从 `finalTy + SPIN_PX` 错峰滚到 `finalTy`（轮2 delay .5s、轮3 delay 1.0s），终点 `yc + finalTy = PAYLINE`，中奖项中心精确落在 payline。

`build_text_slot(pool, winner)` 按 slot-svg.md §7 生成纯文本字符画转轮：三轮同显中奖 emoji，末行给出 "🎉 开！→ 菜名" 文字真相源。用于不渲染 SVG 的客户端（如微信小微）。

- `build_slot_blind`：同一 `pool`、同符号条，仅三轮显示 "?"、转轮不滚动、不输出中奖菜名。
- `session_spun`：同一次对话内的 E 请求共用，传入相同集合；`re_spin` 为已再摇次数（首次为 0）。
- 诚实性：符号条 == `pool`，`winner` 取自 `pool`，动画停点由 `winnerCell` 决定，绝不命中被硬过滤排除的项。
- 跨平台：WorkBuddy 用 `show_widget` 渲染 `svg_open`（含错峰滚动动画）；不支持 widget 的客户端降级为静态 SVG（终态 `finalTy` 烤入 `transform`）或纯文字（`text` 始终是真相源）。
