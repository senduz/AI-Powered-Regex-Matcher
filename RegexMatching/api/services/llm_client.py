import re
from decouple import config
from openai import OpenAI, OpenAIError

client = OpenAI(api_key=config("OPENAI_API_KEY"))

PROMPT_TEMPLATE = """
You are a data-processing assistant.
Instruction: "{instruction}"

Available columns: [{columns_list}]
Data sample:
{sample_csv}

Return exactly one operation as plain key:value lines. 
First line must be:
op_type: <regex|math|conditional_replace|string>
(Ideally, prioritize regex mode, where ever regex can be used, even if using other modes can do the job, use regex instead. Absolute least priority to the string mode, it is only capable of converting to uppercase or lowercase or typecase)
Then supply only the relevant keys for that type, for example:

# REGEX example
op_type: regex
column: Email
pattern: \\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{{2,7}}\\b
replacement: REDACTED

# MATH example
op_type: math
column: Score
operation: round
precision: 0

# CONDITIONAL_REPLACE example (comparison)
op_type: conditional_replace
column: Status
condition: == "Unpaid"
new_value: Critical

# CONDITIONAL_REPLACE example (regex)
op_type: conditional_replace
column: Status
regex_pattern: ^Unpaid$
regex_column: Type
new_value: Critical

 # STRING example (mutate text)
 op_type: string
 column: Name
 mode: uppercase

 # CONDITIONAL_REPLACE example (cross‐column)
 op_type: conditional_replace
 column: Email
 condition_column: Age
 condition: > 10
 new_value: REDACTED

 Note that for String mutation, dont give the function, but give the type of opperation eg: uppercase,lowercase
"""

def parse_operation(instruction: str, columns: list, sample):
    prompt = PROMPT_TEMPLATE.format(
        instruction=instruction,
        columns_list=", ".join(f'"{c}"' for c in columns),
        sample_csv = sample.to_csv(index=False)
    )
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content":prompt}]
    )
    text = resp.choices[0].message.content.strip()
    params = {}
    for line in text.splitlines():
        if ':' not in line: continue
        key, val = line.split(':', 1)
        params[key.strip()] = val.strip().strip('"').strip("'")
    if "op_type" not in params:
        raise RuntimeError(f"No op_type in LLM response:\n{text}")
    if params["op_type"] == "regex" and "pattern" in params:
        raw_pat = params["pattern"]
        if raw_pat.startswith(".*") and raw_pat.endswith(".*"):
            core = raw_pat[2:-2]
            import re
            params["pattern"] = re.escape(core)
    return params