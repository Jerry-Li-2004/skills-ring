"""CSV recommendation engine for the SkillLoop demo."""

from .data import DataSet, load_dataset
from .matching import Match, generate_matches

__all__ = ["DataSet", "Match", "generate_matches", "load_dataset"]
