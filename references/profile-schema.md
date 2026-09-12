# 用户画像与评分数据模型（references/profile-schema.md）

本文件描述轻量用户画像与评分记录的结构。玩具阶段存储于本地/会话级即可，不接数据库。

## 画像结构

~~~
{
  "user_id": "u_local",
  "liked_tags": [],
  "disliked": [],
  "avoid": [],
  "last_items": [],
  "budget": 20,
  "ratings": [
    { "item_id": "m001", "score": 5, "ts": "2026-07-15T12:30" }
  ]
}
~~~

## 字段说明

- `user_id`：本地默认 `u_local`；字段预留以便后续多人部署做协同过滤（不现在实现）。
- `liked_tags` / `disliked`：从评分沉淀的偏好标签。
- `avoid`：用户长期忌口/过敏。
- `last_items`：最近推荐/食用过的 `item_id`，用于 24h 去重。
- `budget`：默认预算。
- `ratings`：闭环沉淀，驱动 EE 与去重；每条带 `item_id` / `score` / `ts`。

## 写入时机

用户吃完并评分后，append 一条 rating，并更新 `liked_tags` / `disliked` / `last_items`。
