import pandas as pd
from .llm_client import parse_operation
from .operation_factory import from_params

class DataProcessor:
    def __init__(self, instruction: str, df: pd.DataFrame):
        self.df = df
        params = parse_operation(
            instruction,
            df.columns.tolist(),
            df.head(10)
        )
        self.op = from_params(params)

    def run(self) -> pd.DataFrame:
        return self.op.apply(self.df)

    def apply_to_chunk(self, chunk: pd.DataFrame) -> pd.DataFrame:
        return self.op.apply(chunk)