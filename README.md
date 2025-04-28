# Regex Match 🔴 🕦

> **Turn any CSV or Excel file into clean, transformed data with one English sentence.**

Regex Match is a **Django 5.2** (REST) backend + **React 18 / Material-UI 5** frontend.

- Upload a spreadsheet
- Describe your substitutions, math, or conditional replacements in plain English
- Get a slick preview table with "..."-truncated cells, virtualised scrolling, and a peach-red theme
- Download the processed CSV — even at **120 MB+** thanks to chunk streaming
- Iterate instantly with the **Re-process** box (same endpoint, new file + prompt)
- LLM-powered error messages explain any regex snafus in human terms

---

## Video Demonstration

**Uploading Soon**






## Features

| 🔧 Backend | 🎨 Frontend |
|-----------|------------|
| Django REST endpoint `POST /api/process/` | CRA + MUI **Chilli** theme |
| **Small ≤ 50 MB** → returns JSON table | Upload UI with drag-and-drop |
| **Large > 50 MB** → streams chunks to disk, returns `download_url` + 100-row preview | Virtualised rows (react-window) smooth to 100k+ |
| `DataProcessor` dispatches to Regex, Math, String, Conditional ops | Double-click row → modal dialog with full values |
| LLM error explainer | Re-process box re-posts the freshly-made CSV |
| CORS + `.env` secrets | Responsive, fixed outer scrollbars |

---

## Mutations Feature Overview

In **Regex Match**, the `Mutations` module allows you to perform flexible and powerful transformations
on your CSV or Excel data by simply describing them in plain English.

It is implemented using an extensible design:
- An abstract `BaseOperation` class
- Concrete subclasses for different types of operations:
  - `RegexOperation`
  - `MathOperation`
  - `StringOperation`
  - `ConditionalReplaceOperation`

Each operation follows a common API:

```python
def apply(self, df: pd.DataFrame) -> pd.DataFrame:
    ...
```

---

## 1. RegexOperation

**Applies regular expression substitutions on a specified column.**

**Example:**
- Pattern: `r"\\s+"` (multiple spaces)
- Replacement: `" "` (single space)

**Natural Language Instruction:**
> Replace multiple spaces with a single space in 'Name' column.

---

## 2. MathOperation

**Performs mathematical operations on numeric columns.**

**Supported operations:**
- `add` (e.g., add 10)
- `subtract`
- `multiply`
- `divide`
- `power` (exponentiation)
- `modulo` (remainder)
- `abs` (absolute value)
- `round` (to N decimals)

**Natural Language Instruction:**
> Add 5 to every entry in 'Salary' column.

---

## 3. StringOperation

**Changes the casing of text values in a column.**

**Supported modes:**
- `uppercase`
- `lowercase`
- `titlecase`

**Natural Language Instruction:**
> Make all entries in 'City' uppercase.

---

## 4. ConditionalReplaceOperation

**Updates a value in a target column based on a condition on another column (or the same column).**

**Conditions supported:**
- Comparison-based: `>`, `<`, `==`, `!=`, `>=`, `<=`
- Regex-based string matches

**Example:**
- Condition: `Status == 'Unpaid'`
- New value: `0` in `AmountDue`

**Natural Language Instruction:**
> If 'Status' is Unpaid, set 'AmountDue' to 0.

---

## Helper: _eval_condition

Safely parses and evaluates conditions like `>= 100`, `< "Low"`, etc.,
mapping string expressions to Python's operator functions.

---

## Extensibility

You can easily add new types of operations in the future:
- Create a subclass inheriting from `BaseOperation`
- Implement the `apply()` method
- Register it inside the `OperationFactory`

> This design ensures Regex Match remains highly modular, scalable, and customizable.


---

## LLM Error Explainer Overview

In **Regex Match**, when an unexpected error occurs, instead of showing a boring stack trace,
we use an LLM (Large Language Model) to turn that cryptic error into a casual, friendly, and helpful explanation.

It is powered by:
- **Library**: `openai`
- **Model**: `gpt-4o-mini`

The workflow:
- Catch the raw exception.
- Format it into a playful prompt template.
- Ask the LLM to generate an informal explanation.
- Show that explanation to the user in the frontend.

Example Behavior:
- If the error is user's fault (e.g., wrong column name), lightly tease and guide them.
- If it's a system error (e.g., backend crash), apologize and reassure.

**Key Function:**

```python
def explain_error(raw_error: str) -> str:
    resp = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": ERROR_PROMPT.format(error=raw_error)}]
    )
    return resp.choices[0].message.content.strip()
```

**Prompt Rules:**
- Start with an informal opener.
- Explain briefly and funnily.
- Suggest actionable next steps.
- No code dumps or stack traces.

> This feature massively improves UX for non-technical users and makes Regex Match feel friendly and supportive!

## Tech Stack

- Backend: Django 5.2, djangorestframework 3.15
- Frontend: React 18, Material UI 5, react-window 1.8
- LLM Integration: OpenAI 1.x
- Utilities: Pandas, NumPy, CORS Headers

---

## Quick Start


```bash
# Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # add your OpenAI key
python manage.py runserver

# Frontend
cd regex-front
npm install
npm start
```

Access via:
- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8000

---

## API Spec

### POST /api/process/

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✔ | CSV/XLSX file |
| `natural_language` | String | ✔ | Plain English instruction |

**Responses:**
- Small file: returns JSON data
- Large file: returns `download_url` for download

### GET /api/download/<uuid>/

Streamed download of processed CSV.

---

## Front-end Commands

```bash
npm start        # development
npm run build    # production build
npm test         # test runner
```


---

## Credits & License

- **Author**: Vignesh
- **License**: MIT License

> Contributions and forks welcome! 🚀
