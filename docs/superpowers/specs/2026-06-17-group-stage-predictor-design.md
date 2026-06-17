# 小组赛出线/头名预测 — 设计文档

日期：2026-06-17
状态：已确认，待实现

## 目标

小组赛接近尾声，复用现有量化引擎，预测每个小组的**头名**与**出线名额**：对每支球队给出
- `P(头名)` — 小组第一的概率
- `P(出线)` — 晋级（前二）的概率

并展示当前积分形势与「已出线 / 已出局」状态。

## 范围（已锁定）

纳入：
- **ELO**（`server/engine/elo.js`）→ 预期进球
- **泊松 + Dixon-Coles 比分矩阵**（`server/engine/matrix.js`）→ 单场比分分布
- **贝叶斯后验**（`server/engine/bayesian.js`）+ **真实 xG**（`approximateXG`，`server/engine/tempo.js`）—— **仅对正在直播的小组赛场次**，让进行中的那场算得更准

不纳入（明确排除，避免牵强）：
- **凯利**（投注 edge 工具，需要「小组头名」盘口才有意义，无此盘口）
- **MEI**（单场市场情绪指标，与「谁出线」非同一量纲）

## 关键问题：赛程没有小组标签

`wc2026_fixtures.js` 与 ESPN service 只把比赛标为 `Group Stage - 1/2/3`（按日期推断），**没有 A/B/C 组别**。

**解法：连通分量推断。** 组内互相交手的球队聚成一簇。仅当一簇**正好 4 支球队、且踢满 6 场组内比赛**时，才认定为有效小组。
- 真实 ESPN 2026 数据：每队只与同组 3 队交手 → 得出干净的小组。
- 虚构后备赛程（MD3 有跨组对阵，会把多簇混在一起）：推断失败 → 页面显示「小组数据暂不可用」，绝不给出错误分组。

## 架构

### 引擎 — `server/engine/groups.js`（纯函数、可测试）

- `inferGroups(fixtures)` → `[{ teams[], playedMatches[], remainingMatches[] }]`
  - 连通分量；校验 4 队 / 6 场；不合格的簇丢弃
- `currentStandings(group)` → 每队 `{ pts, pld, gf, ga, gd, w, d, l }`，仅由 FT 比赛累加
- `matchScorelineDist(match)` → 剪枝后的 `[{ h, a, p }]`
  - 未开赛：`elo.expectedGoals` → `buildDCMatrix`
  - 直播中：以 `bayesian` 后验 + 实时 `approximateXG` 推算该场剩余进球分布，与当前比分合成最终比分分布
  - 剪枝：按概率从高到低保留覆盖 ≥99% 概率质量的比分（约 10–12 个）
- `projectGroup(group)` → **解析式枚举**
  - 对所有剩余比赛的比分分布做笛卡尔积
  - 每种组合：叠加到当前积分 → 生成最终积分表 → 套用比较规则 → 定出名次
  - 累加每队的 `P(头名)`、`P(出线/前二)`；同时算预期积分
  - `clinched`（已出线）/ `eliminated`（已出局）作为 100% / 0% 自然落出

### 比较规则（FIFA 世界杯 2026 顺序）

**注意：2026 规则改了** —— 相互战绩排在「总净胜球」之前（与 2018/2022 相反）。

1. 总积分
2. 相互战绩小表（同分球队之间）：积分 → 净胜球 → 进球
3. 总净胜球
4. 总进球数
5. ELO 兜底（确定性，代替公平竞赛分/FIFA 排名，杜绝无法分胜负的并列）

### 可行性保护

组合数 = (每场比分数)^(剩余场次)。小组赛尾声通常每组 ≤2 场剩余 → ≤~150 种组合，精确且瞬时。
剪枝把每场比分数压到约 10–12。若某组组合数超过硬上限，降到更粗的比分网格并标记 `approx: true`。

### 需要的改动

- `server/engine/matrix.js`：导出 `buildDCMatrix`（目前私有），供 group 引擎枚举比分。

### API — `server/routes/groups.js`

- `GET /api/groups` → `[{ groupKey, teams: [{ name, logo, standing, pWin, pAdvance, expPts, clinched, eliminated }], remainingMatches }]`
- 缓存约 120s；该组有直播场次时取更短 TTL
- 在 `server/index.js` 挂载路由

### 前端 — 新增「小组」页/标签

- `client/src/pages/Groups.jsx`
- `client/src/App.jsx` 加路由
- `client/src/components/BottomNav.jsx` / `Sidebar.jsx` 加入口
- `client/src/api/index.js` 加 `getGroups()`
- 每个小组一张卡片：
  - 按当前排名排序的迷你积分表（Pld / GD / Pts）
  - 两条概率条：**小组第一** 与 **出线**（沿用现有进度条/仪表样式）
  - 「已出线 / 已出局」徽章
  - 推断失败时显示「小组数据暂不可用」

## 测试

`server/test/` 风格的单元测试，针对 `groups.js`：
- 积分统计正确
- 比较规则排序（含相互战绩小表）
- 每组 `P(头名)` 之和 ≈ 100%、`P(出线)` 之和 ≈ 200%
- 已出线 / 已出局边界情况
- 连通分量推断：干净数据得 4 队组；脏数据被拒

## 数据流

```
ESPN fixtures
  → inferGroups (连通分量 + 校验)
  → currentStandings (FT 比赛累加)
  → 每场 remainingMatch:
       未开赛 → ELO xG → buildDCMatrix
       直播中 → bayesian 后验 + 真实 xG → 合成
     → matchScorelineDist (剪枝 99%)
  → projectGroup (笛卡尔积枚举 + 比较规则)
  → GET /api/groups
  → Groups.jsx 卡片渲染
```
