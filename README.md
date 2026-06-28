# Cella：会陪你生长的知识生命

Cella 是一个面向作品集展示的互动学习概念。它把理性的刷题进度转译成一只会呼吸、游动、发光和修复记忆的细胞伙伴，让复习不再只是数字与正确率。

## 核心概念

- 每个学习者拥有一只独立的 Cella。
- Cella 会在答题页面自由游动，也可以被拖到喜欢的位置。
- 它会靠近当前题目，根据题型、章节和作答结果给出不同反馈。
- 答对意味着记忆稳定和发光，答错意味着留下待修复记忆，不使用惩罚或死亡机制。
- 首页培养皿表达“还有其他人与你一起学习”，用陪伴感取代排行榜压力。
- 访客可以通过演示模式直接体验，无需先创建身份。

## 设计意图

传统刷题工具常把学习压缩为进度条、正确率和排名。Cella 借鉴拓麻歌子的陪伴关系，但不加入喂食、签到、货币或死亡等额外负担。所有生命反馈都由真实学习行为自然触发。

> 学习不只是数字。它会呼吸、修复，也会在陪伴里慢慢长大。

静态前端部署在 GitHub Pages，题库保存在 `data/`，答题事件、科目进度和用户地图数据由 Supabase 提供。

## 首页数据接口

接口通过 `js/analytics.js` 调用 Supabase RPC。

### 跨设备身份

网站使用“学习同步码”恢复匿名身份，不再要求邀请码。前端将同步码与固定盐值进行 SHA-256 摘要，生成：

```text
account_<sha256>
```

服务端只接收摘要，不接收同步码明文。不同设备输入相同同步码会得到相同匿名用户 ID。

首次设置同步码时调用 `claim_review_identity`，把当前浏览器原匿名 ID 下的答题事件合并到同步账号。

> 这是轻量同步身份，不是完整密码认证。同步码应设置得足够长且不要分享。

### `register_review_user`

请求：

```json
{ "p_visitor_id": "浏览器匿名用户 ID" }
```

用途：登记访问过复习地图的用户。当前项目没有正式账号体系，因此以持久化在浏览器中的匿名 ID 作为用户 ID。

### `get_review_subjects`

请求：

```json
{ "p_visitor_id": "当前用户 ID" }
```

响应数组字段：

```json
{
  "id": "bigdata",
  "name": "大数据原理与应用",
  "status": "ready",
  "question_count": 177,
  "answered_count": 31,
  "progress": 17.5
}
```

- `status`: `ready` 或 `reserved`
- `answered_count`: 当前用户做过的不同题目数量
- `progress`: `answered_count / question_count * 100`

### `get_review_users`

请求：

```json
{ "p_visitor_id": "当前用户 ID" }
```

响应数组字段：

```json
{
  "id": "匿名用户 ID 的不可逆摘要",
  "is_current_user": true,
  "answered_count": 120,
  "mastered_count": 100,
  "progress": 28.7
}
```

接口返回 `review_users` 中的全部用户，不包含在线状态字段。前端不会显示用户姓名，只通过视觉高亮区分当前用户。
细胞尺寸根据 `progress` 从小到大变化。

### 细胞颜色多端同步

首页“我的”面板中的细胞颜色通过独立表 `review_cell_preferences` 保存，并使用当前同步身份作为键。
首次启用时，在 Supabase SQL Editor 中运行 `cell-preferences-migration.sql`。该迁移不会修改现有答题记录、科目进度或排行榜数据。

### `get_subject_state`

返回当前同步账号在指定科目下每道做过题目的掌握状态，用于不同设备恢复刷题进度：

```json
{
  "question_id": "bd_c1_s1",
  "mastered": true
}
```

### `reset_subject_progress`

删除当前同步账号指定科目的线上答题事件，使“重置数据”在所有设备生效。

## 数据库安装

在 Supabase SQL Editor 中完整运行 `supabase-stats-v2.sql`。脚本会创建科目表、用户表以及首页和统计页使用的 RPC。
