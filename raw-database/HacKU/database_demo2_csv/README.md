# 正式数据库的 CSV 快照

本文件夹从 `../database_demo2/skill_swap_algorithm_input.db` 只读导出，供查看和算法联调。正式数据源仍是 SQLite 数据库；这里是同一批数据的 CSV 副本，不是 `HacKU2026/result_outputs` 中的演示结果。

- 共 25 个 UTF-8 CSV：24 张 SQL 表各一份，另有 1 份派生视图 `current_user_reliability.csv`。每份 CSV 的首行与数据库列名一致。
- 全量保留 300 位用户、50 项技能、500 条 Offer、500 条 Need，以及对应时间、偏好、技能价值和可靠性输入记录；没有抽样或随机补数。
- `matches.csv`、`recommendation_rankings.csv` 等当前轮次的算法输出文件只有表头、没有数据行，因为正式数据库中的相应 SQL 表目前为空。算法计算完成后再产生这些结果。
- `current_user_reliability.csv` 是数据库视图的快照，含 300 位用户的当前可靠性结果；它不是独立的基础表。
- CSV 不保留主键、外键、检查约束和视图定义。SQL 数据库仍是正式版本；如需重新导入或修改结构，应以 `.db` 的表定义为准。
- 数据库中的 `NULL` 在 CSV 中表示为空字段。文件没有附加 `#` 注释行，普通 CSV 读取器可直接读取。

导出脚本：`../database_build_tools/export_formal_csv.py`。为避免覆盖已有交接文件，脚本在目标文件夹已存在时会停止；刷新前请先确认旧快照是否仍需保留。
