from decouple import config
from openai import OpenAI

llm = OpenAI(api_key=config("OPENAI_API_KEY"))

ERROR_PROMPT = """
You are a sassy, fun assistant that turns cryptic exceptions into informal, playful messages.

Here’s the raw error we caught:

{error}

**Rules:**
- If this error was caused by something the user did (like missing columns, NaN values, bad input), cheekily let them know it’s on them and encourage them to fix it.  
- If it’s due to our system’s missing feature or an internal bug, apologize and reassure them it’s not their fault.  

**In your reply:**
1. Start with an informal opener  
2. Give a clear, fun one‐line description of what went wrong.  
3. Provide one or two actionable next steps.  
4. Keep it short, casual, and friendly—no stack traces or code.

Go!
"""

def explain_error(raw_error: str) -> str:
    resp = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": ERROR_PROMPT.format(error=raw_error)}]
    )
    return resp.choices[0].message.content.strip()