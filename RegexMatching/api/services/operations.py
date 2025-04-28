from abc import ABC, abstractmethod
import pandas as pd
import re
import operator
from pandas.api.types import is_numeric_dtype, is_integer_dtype, is_string_dtype

class BaseOperation(ABC):
    def __init__(self, params: dict):
        self.params = params

    @abstractmethod
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        ...

class RegexOperation(BaseOperation):
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        col   = self.params["column"]
        pat   = self.params["pattern"]
        repl  = self.params["replacement"]
        df[col] = df[col].astype(str).str.replace(pat, repl, regex=True)
        return df

class MathOperation(BaseOperation):
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        col     = self.params["column"]
        op_name = self.params["operation"]    # e.g. "add","subtract","multiply",…
        # For operations requiring a numeric operand:
        val      = self.params.get("value")
        # For round, we expect "precision" instead of "value"
        precision = self.params.get("precision")

        # Always work on floats initially
        series = df[col].astype(float)

        if op_name == "add":
            if val is None:
                raise ValueError("Missing 'value' for add operation")
            num = float(val)
            df[col] = series + num

        elif op_name == "subtract":
            if val is None:
                raise ValueError("Missing 'value' for subtract operation")
            num = float(val)
            df[col] = series - num

        elif op_name == "multiply":
            if val is None:
                raise ValueError("Missing 'value' for multiply operation")
            num = float(val)
            df[col] = series * num

        elif op_name == "divide":
            if val is None:
                raise ValueError("Missing 'value' for divide operation")
            num = float(val)
            df[col] = series / num

        elif op_name == "power":
            if val is None:
                raise ValueError("Missing 'value' for power operation")
            num = float(val)
            df[col] = series.pow(num)

        elif op_name == "modulo":
            if val is None:
                raise ValueError("Missing 'value' for modulo operation")
            num = float(val)
            df[col] = series % num

        elif op_name == "abs":
            df[col] = series.abs()

        elif op_name == "round":
            if precision is None:
                raise ValueError("Missing 'precision' for round operation")
            prec = int(precision)
            rounded = series.round(prec)
            # cast to int if zero decimals
            if prec == 0:
                df[col] = rounded.astype(int)
            else:
                df[col] = rounded

        else:
            raise ValueError(f"Unsupported math operation: {op_name}")

        return df


class ConditionalReplaceOperation(BaseOperation):
    """
    Replace values in one column when a condition holds on another (or same) column.
    """
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        target_col = self.params["column"]
        new_val    = self.params["new_value"]

        # determine which column drives the condition
        cond_col = self.params.get("condition_column", target_col)

        # 1) Regex-based if provided
        if "regex_pattern" in self.params:
            pat = self.params["regex_pattern"]
            mask = df[cond_col].astype(str).str.match(pat, na=False)

        # 2) Comparison-based
        else:
            cond = self.params["condition"]  # e.g. '> 10' or '== "Unpaid"'
            mask = df[cond_col].map(lambda v: _eval_condition(v, cond))

        # 3) Assign new_val into target_col with proper casting
        col_ser = df[target_col]
        if is_numeric_dtype(col_ser):
            # numeric column → cast new_val to number
            try:
                num = float(new_val)
            except ValueError:
                raise ValueError(
                    f"Cannot assign non-numeric '{new_val}' to numeric column '{target_col}'"
                )
            if is_integer_dtype(col_ser):
                num = int(num)
            df.loc[mask, target_col] = num

        else:
            # string/other → allow any
            df[target_col] = df[target_col].astype(object)
            df.loc[mask, target_col] = new_val

        return df

class StringOperation(BaseOperation):
    """
    Mutate text in a column by mode: uppercase, lowercase, or titlecase.
    """
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        col  = self.params["column"]
        mode = self.params["mode"].lower()  # uppercase|lowercase|titlecase

        # ensure string dtype
        df[col] = df[col].astype(str)

        if mode == "uppercase":
            df[col] = df[col].str.upper()
        elif mode == "lowercase":
            df[col] = df[col].str.lower()
        elif mode == "titlecase":
            df[col] = df[col].str.title()
        else:
            raise ValueError(f"Unsupported string mode: {mode}")
        return df

def _eval_condition(value, cond_str):
    ops = {
        "==": operator.eq, "!=" : operator.ne,
        ">=": operator.ge, "<=" : operator.le,
        ">" : operator.gt,  "<" : operator.lt,
    }
    m = re.match(r'^\s*(==|!=|>=|<=|>|<)\s*(.+)$', cond_str)
    if not m:
        raise ValueError(f"Invalid condition: {cond_str}")
    op_sym, literal = m.groups()
    literal = literal.strip().strip('"').strip("'")
    try:
        literal_val = float(literal)
        value = float(value)
    except ValueError:
        literal_val = literal
    return ops[op_sym](value, literal_val)
