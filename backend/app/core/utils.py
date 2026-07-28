import math
from typing import Any

def parse_numeric_value(raw_val: Any, data_type: str = "float") -> Any:
    """Parses raw string value into numeric int or float according to data_type specification."""
    try:
        if "int" in data_type.lower():
            return int(float(raw_val))
        val = float(raw_val)
        if math.isnan(val) or math.isinf(val):
            return 0.0
        return round(val, 4)
    except (ValueError, TypeError):
        return raw_val

def compute_days_difference(dt_str_1: str, dt_str_2: str) -> int:
    from datetime import datetime
    try:
        d1 = datetime.strptime(dt_str_1.split()[0], "%Y-%m-%d")
        d2 = datetime.strptime(dt_str_2.split()[0], "%Y-%m-%d")
        return (d1 - d2).days
    except Exception:
        return 0
