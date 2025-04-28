import pandas as pd
from .services.processor import DataProcessor

def process_file_with_operations(file, instruction: str) -> pd.DataFrame:
    if file.name.lower().endswith('.csv'):
        df = pd.read_csv(file)
    else:
        df = pd.read_excel(file)
    processor = DataProcessor(instruction, df)
    return processor.run()