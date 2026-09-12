# chishenme 打包台账

## 一、打包纪律

1. 唯一归档位：所有发布包只存放在 `dist/`
2. 命名规范：`<slug>-vX.Y.Z.zip`
3. 结构保留：zip 保留 `references/` 子目录
4. 排除规则：旧版本包、运行时元数据、隐藏文件、白名单外扩展名
5. 打包后登记 SHA256

## 二、版本记录表

| 版本 | 打包时间 | 文件数 | 文件名 | SHA256 | 位置 | 状态 |
|------|----------|--------|--------|--------|------|------|
| v2.3.0 | 2026-09-01 18:30 | 6 | chishenme-v2.3.0.zip | C9094185530C6FC2872230EA5631AF1FCE479E6D51DB453B72840832CDA54B2D | `dist/` | ✅ 当前 |
| v2.1.0 | 2026-09-01 18:00 | 6 | chishenme-v2.1.0.zip | F23BA3F96BBA4B50428019B1D296C0AC1C2610091D2C68898655A875848EA41C | `dist/` | 🗄️ 历史 |
| v2.0.0 | 2026-09-01 17:30 | 6 | chishenme-v2.0.0.zip | F376AC8DCF2A8FA363C89564147847FC89B3058DE4B49E0B42B5672968DA022C | `dist/` | 🗄️ 历史 |
| v1.1.1 | 2026-07-17 | — | chishenme-v1.1.1.zip | — | 源目录根/联想上架包 | 🗄️ 历史 |
| v1.1.0 | 2026-07-17 | — | chishenme-v1.1.0.zip | — | 源目录根/上架包 | 🗄️ 历史 |

## 三、缺陷复盘

（无）

## 四、清理记录

| 处置时间 | 目标文件/目录 | 原位置 | 处置方式 | 前提条件 |
|----------|--------------|--------|----------|---------|
| — | chishenme-上架包/ | 源目录根 | 待确认 | 用户确认后清理 |
| — | chishenme-联想上架包/ | 源目录根 | 待确认 | 用户确认后清理 |
| — | references/logic.md | 源目录/references | 待确认 | 用户确认后清理 |
| — | references/profile-schema.md | 源目录/references | 待确认 | 用户确认后清理 |
| — | references/samples.md | 源目录/references | 待确认 | 用户确认后清理 |
| — | references/self-test.md | 源目录/references | 待确认 | 用户确认后清理 |
| — | references/slot-svg.md | 源目录/references | 待确认 | 用户确认后清理 |
| — | chishenme-v2.0.0.zip | dist/ | 待确认 | 用户确认后清理 |