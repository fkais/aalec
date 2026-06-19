# aalec 期末复习站

静态前端部署在 GitHub Pages，题库保存在 `data/`，答题事件、科目进度和用户地图数据由 Supabase 提供。

## 首页数据接口

接口通过 `js/analytics.js` 调用 Supabase RPC。

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
  "is_current_user": true
}
```

接口返回 `review_users` 中的全部用户，不包含在线状态字段。前端不会显示用户姓名，只通过视觉高亮区分当前用户。

## 数据库安装

在 Supabase SQL Editor 中完整运行 `supabase-stats-v2.sql`。脚本会创建科目表、用户表以及首页和统计页使用的 RPC。
