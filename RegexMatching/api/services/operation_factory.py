from .operations import (
    RegexOperation,
    MathOperation,
    ConditionalReplaceOperation,
    StringOperation,
)

OP_MAP = {
    "regex": RegexOperation,
    "math": MathOperation,
    "conditional_replace": ConditionalReplaceOperation,
    "string": StringOperation,
}

def from_params(params: dict):
    op_type = params.get("op_type")
    if op_type not in OP_MAP:
        raise ValueError(f"Unknown op_type: {op_type}")
    return OP_MAP[op_type](params)