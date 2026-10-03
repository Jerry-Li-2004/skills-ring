# HacKU2026 Skill Swap Recommendation Demo

当前版本从正式数据库的 CSV 快照生成完整推荐结果，读取现有 25 个 CSV，保持原有表名、字段和输入内容。

## Input data

The default data directory is:

```text
HacKU/database_demo2_csv
```

The source CSV files are read-only inputs. The algorithm does not modify them.

## Run the demo

From the project root:

```powershell
python main.py
```

To use another CSV directory:

```powershell
python main.py --data-dir path\to\csv_data --output-dir result_outputs
```

Generated files:

```text
result_outputs/matches.csv
result_outputs/recommendation_rankings.csv
```

`matches.csv` contains one row per Direct Match or complete three-person Cycle. `recommendation_rankings.csv` assigns a rank to each Match for each participating user.

Both output files append a `#`-prefixed field documentation block after the data rows. CSV consumers that load these files programmatically should ignore lines whose first non-whitespace character is `#`.

## Run tests

```powershell
python -m unittest discover -s tests -v
```

## Implemented rules

- Strict skill matching.
- Active users, skills, offers and needs only.
- Provider level must satisfy `required_provider_level`.
- Offer duration must be at least the requested duration.
- Offer capacity must be at least the requested session count.
- Compatible mode and overlapping time slots are required.
- Explicitly excluded skills are rejected; Preferred and Acceptable are retained but do not change the score.
- Self-matching is rejected.
- Direct and three-person Cycle candidates are both generated and ranked together.
- Direct reciprocity is 100; Cycle reciprocity is 85.
- Cycle features are averages of the three Edge features.
- Ties prefer Direct over Cycle.
- Location is used through Convenience: same location 100, Anywhere 100, different physical locations 70, Online 100.
- Reliability cold start is 50 and missing contribution history is treated as 0.

## 新版历史数据读取

没有相应历史记录的用户统一使用可靠性 50、贡献 0、风险 0。
与具体 Offer/Need 有关的分数仍根据实际条件计算。

- 可靠性按 calculated_at、reliability_id 取最新非空历史分。若无明细，可使用
  current_user_reliability 的非冷启动快照；历史明细优先于可能过期的 CSV 视图快照。
- 贡献按 provider_id 累计 settlement_status 为 Settled 的 contribution_value，
  用 log1p 与历史最大用户累计值做归一化。Unsettled 记录暂不计分。
- 承诺负担按 debtor_id 统计 Proposed 和 Active 的 commitments 行数。
  风险为承诺数除以 3 乘 100，限制在 0–100。

输入配置 max_active_commitments 当前是 1。按照已确认的业务规则，代码使用风险分母 3，
不会修改输入配置。这只影响风险评分，不作为拒绝匹配的硬上限。

服务价值使用 BaseValue × LevelFactor × (Offer.duration_minutes / 60)
× Need.sessions_needed × Offer.value_adjustment。
Offer.max_sessions 用于容量过滤以及有效 Offer 最大价值的归一化基准。
价值差异只影响分数，不做硬过滤。
各项 Edge 分数在 Match 内取平均；风险先在 Edge 上取双方较高值，再在 Match 内平均。

## 已确认交换的资源排除

通过输入 exchange_matches 关联 exchanges 与 matches，提取完整 Match 的所有 Offer/Need。

- Proposed 邀请阶段不锁定；单个 Accepted 事件不等于正式 Confirmed。
- Confirmed、Active、Settled、Disputed、Defaulted 排除关联的全部 Offer/Need。
- Withdrawn 解除此 Exchange 的锁定；如果资源仍被其他 Exchange 锁定，则继续排除。
- 解除锁定后还必须满足原始 Offer/Need 为 Active，才能再次推荐。
- 锁定中的 Exchange 缺少来源 Match 或关联记录时，报错停止。

CSV 排序器读取正式交换状态。Direct 双方接受、Cycle 全员接受后写入 Confirmed 的业务流程，
以及注册、履约、结算和可靠性自动更新，将在下一轮实现。
已确认的来源 Match 必须保留在输入/数据库历史中。

## 结果更新与运行边界

每次运行重新读取 CSV、全量计算并覆盖 result_outputs 中两份结果。
输出目录必须位于输入目录以外，避免覆盖输入历史。
输入中的 matches.csv 是历史来源记录；输出中的同名文件是本轮候选推荐。
输入历史、邀请、交换和履约记录不会被本轮输出覆盖。

CSV 输出全部方案及每位用户的全部排名，不截断 Top 20。
数据库每位用户 Top 20 写回将在后续数据库接入时实现。
每位用户的 rank_position 从 1 连续编号，同分 Direct 优先，其次按稳定 match_id 排序。
Cycle 旋转去重，并采用稳定的起始 Edge，输入行顺序改变不会改变 Match ID。

DataSet 的索引按单次读取缓存；修改 CSV 后重新运行 main.py 即可使用新数据。

当前交付输入的基线：576 条候选 Edge、91 个 Direct、13 个 Cycle、104 个完整方案、
221 条用户排名。这是本批数据的计算结果，代码没有固定数量限制。
测试覆盖冷启动、历史聚合、锁定资源、Cycle、稳定排序和重复运行覆盖输出。
