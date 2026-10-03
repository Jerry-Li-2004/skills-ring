from __future__ import annotations

import csv
import io
from pathlib import Path

from .matching import Match


MATCH_FIELDS = [
    "match_id",
    "match_type",
    "user_a",
    "user_b",
    "user_c",
    "offer_id_a",
    "need_id_a",
    "offer_id_b",
    "need_id_b",
    "offer_id_c",
    "need_id_c",
    "compatibility_score",
    "level_score",
    "availability_score",
    "convenience_score",
    "reciprocity_score",
    "contribution_score",
    "reliability_score",
    "risk_score",
    "level_value_score",
    "value_balance_score",
    "final_score",
]

RANK_FIELDS = ["match_id", "target_user_id", "rank_position"]

MATCH_COMMENTS = [
    "# Field comments: the following lines are documentation and are not data rows.",
    "# match_id | 匹配ID | 字符串 | D- 开头表示 Direct，C- 开头表示 Cycle",
    "# match_type | 匹配类型 | Direct 或 Cycle | Direct 为两人交换，Cycle 为三人循环",
    "# user_a | 参与用户 A | 用户ID字符串 | Direct 的第一位用户；Cycle 的起点用户",
    "# user_b | 参与用户 B | 用户ID字符串 | Direct 的第二位用户；Cycle 的第二位用户",
    "# user_c | 参与用户 C | 用户ID字符串或空 | Direct 为空；Cycle 必须有第三位用户",
    "# offer_id_a | Edge A 的 Offer ID | Offer ID字符串 | A 用户提供给下一位用户的服务",
    "# need_id_a | Edge A 的 Need ID | Need ID字符串 | Edge A 满足的需求",
    "# offer_id_b | Edge B 的 Offer ID | Offer ID字符串 | Direct 为反向 Edge；Cycle 为 B→C",
    "# need_id_b | Edge B 的 Need ID | Need ID字符串 | Edge B 满足的需求",
    "# offer_id_c | Edge C 的 Offer ID | Offer ID字符串或空 | Direct 为空；Cycle 为 C→A",
    "# need_id_c | Edge C 的 Need ID | Need ID字符串或空 | Direct 为空；Cycle 为 C→A 满足的需求",
    "# compatibility_score | 技能和能力兼容度 | 0-100 | 0.6×SkillMatch + 0.4×LevelScore",
    "# level_score | Offer 提供者等级分 | 0-100 | Beginner≈55.555556，Intermediate≈66.666667，Advanced≈83.333333，Expert=100；Match 取 Edge 平均",
    "# availability_score | 时间可用度 | 0-100 | 共同时间段数量 ÷ Need 时间段数量 × 100",
    "# convenience_score | 便利度 | 0-100 | 同地点/Anywhere/Online=100，不同实体地点=70",
    "# reciprocity_score | 互惠分 | Direct=100，Cycle=85 | Cycle 使用固定值 85",
    "# contribution_score | 历史贡献分 | 0-100 | 按 provider_id 累计 Settled 贡献，对数归一化；无记录为 0；Match 取 Edge 平均",
    "# reliability_score | 可靠性分 | 0-100 | 最新非空历史快照优先，其次非冷启动视图快照；无历史默认 50；Match 取 Edge 平均",
    "# risk_score | 风险分 | 0-100 | 按 debtor_id 统计 Proposed/Active 承诺，除以 3 并限幅；Edge 取双方较高值，Match 取 Edge 平均",
    "# level_value_score | 服务价值归一化分 | 0-100 | Effective Value 相对有效 Offer 最大值归一化",
    "# value_balance_score | 价值平衡分 | 0-100 | Match 内各 Edge 服务价值的平衡程度",
    "# final_score | 最终推荐分 | 理论范围 -5 至 100 | 0.25×可靠性+0.20×兼容度+0.15×时间+0.15×互惠+0.10×贡献+0.05×便利+0.05×价值平衡+0.05×服务价值-0.05×风险",
]

RANK_COMMENTS = [
    "# Field comments: the following lines are documentation and are not data rows.",
    "# match_id | 匹配ID | 字符串 | 对应 matches.csv 中的完整 Match",
    "# target_user_id | 推荐目标用户 | 用户ID字符串 | 该用户看到这条推荐",
    "# rank_position | 用户内排序 | 正整数，从 1 开始 | 按该用户的 Final Score 排序，同分时 Direct 优先",
]


def _fmt(value: object) -> str:
    if isinstance(value, float):
        return f"{value:.6f}".rstrip("0").rstrip(".")
    return str(value)


def _match_row(match: Match) -> dict[str, str]:
    row = {field: "" for field in MATCH_FIELDS}
    row.update(
        {
            "match_id": match.match_id,
            "match_type": match.match_type,
            "user_a": match.edges[0].offer["user_id"],
            "user_b": match.edges[0].need["user_id"],
        }
    )
    if match.match_type == "Cycle":
        row["user_c"] = match.edges[1].need["user_id"]

    for index, edge in enumerate(match.edges):
        suffix = chr(ord("a") + index)
        row[f"offer_id_{suffix}"] = edge.offer["offer_id"]
        row[f"need_id_{suffix}"] = edge.need["need_id"]

    for field, value in match.scores.items():
        row[field] = _fmt(value)
    return row


def write_outputs(matches: list[Match], output_dir: str | Path) -> tuple[Path, Path]:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    matches_path = output_path / "matches.csv"
    rankings_path = output_path / "recommendation_rankings.csv"

    matches_buffer = io.StringIO(newline="")
    matches_writer = csv.DictWriter(
        matches_buffer,
        fieldnames=MATCH_FIELDS,
        lineterminator="\n",
    )
    matches_writer.writeheader()
    matches_writer.writerows(_match_row(match) for match in matches)
    matches_text = matches_buffer.getvalue().rstrip("\r\n") + "\n" + "\n".join(MATCH_COMMENTS) + "\n"
    matches_path.write_text(matches_text, encoding="utf-8")

    by_user: dict[str, list[Match]] = {}
    for match in matches:
        for user_id in match.participants:
            by_user.setdefault(user_id, []).append(match)

    ranking_rows: list[dict[str, str]] = []
    for user_id, user_matches in sorted(by_user.items()):
        user_matches.sort(
            key=lambda match: (
                -match.scores["final_score"],
                0 if match.match_type == "Direct" else 1,
                match.match_id,
            )
        )
        for rank, match in enumerate(user_matches, start=1):
            ranking_rows.append(
                {
                    "match_id": match.match_id,
                    "target_user_id": user_id,
                    "rank_position": str(rank),
                }
            )

    rankings_buffer = io.StringIO(newline="")
    rankings_writer = csv.DictWriter(
        rankings_buffer,
        fieldnames=RANK_FIELDS,
        lineterminator="\n",
    )
    rankings_writer.writeheader()
    rankings_writer.writerows(ranking_rows)
    rankings_text = rankings_buffer.getvalue().rstrip("\r\n") + "\n" + "\n".join(RANK_COMMENTS) + "\n"
    rankings_path.write_text(rankings_text, encoding="utf-8")

    return matches_path, rankings_path
