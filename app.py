# ── requirements ─────────────────────────────────────────
# pip install fastapi uvicorn pandas requests openpyxl
# --------------------------------------------------------
import io, re, time, requests, pandas as pd, numpy as np
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import Any # Added for type hinting

# ------------- CONFIG -------------------------------------------------
PUBLISHED_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTJ6fFeLq7YkaLXhDA_VXyCSRkc_X6uXDUvk9P08AGNWUx4Dc6RcBuxYOQMlaKFisJVBMquQBIj7Djl"
    "/pubhtml?widget=true&headers=false"
)
CACHE_TTL = 300        # seconds to keep data in memory
# ---------------------------------------------------------------------

app = FastAPI(title="IVDAR Sheet API")

# CORS Configuration
origins = [
    "http://localhost:5500",  # Allow Five Server default port
    "http://127.0.0.1:5500", # Allow Five Server default IP
    # You could add other origins here if needed, e.g., your deployed frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET"], # Only allow GET requests for this API
    allow_headers=["*"],
)

# _cache: dict[str, tuple[float, dict]] = {}   # tab-name → (timestamp, JSON-rows) # Cache disabled

def _xlsx_endpoint(url: str) -> str:
    # /pubhtml … → /pub?output=xlsx  (documented trick) :contentReference[oaicite:1]{index=1}
    return re.sub(r"/pubhtml.*", "/pub?output=xlsx", url, flags=re.I)

def _download_sheet() -> dict[str, pd.DataFrame]:
    """Return {tab_name: DataFrame} with raw data, no header."""
    try:
        resp = requests.get(_xlsx_endpoint(PUBLISHED_URL), timeout=30)
        resp.raise_for_status() # Raise exception for bad status codes
    except requests.exceptions.RequestException as e:
        print(f"Error downloading sheet: {e}")
        raise HTTPException(502, f"Error contacting Google Sheets: {e}")

    try:
        book = pd.ExcelFile(io.BytesIO(resp.content))
        result: dict[str, pd.DataFrame] = {}
        for name in book.sheet_names:
            # Read without header, fill NA immediately
            result[name] = book.parse(name, header=None).fillna("")
        return result
    except Exception as e:
        print(f"Error parsing Excel file: {e}")
        raise HTTPException(500, f"Error processing sheet data: {e}")

def _get_raw_dfs() -> dict[str, pd.DataFrame]:
    # --- Simplified: Always download fresh data, bypass cache for now ---
    # now = time.time()
    # if _cache and now - next(iter(_cache.values()))[0] < CACHE_TTL:
    #     # Complex cache retrieval logic would go here
    #     pass
    #
    # fresh_dfs = _download_sheet()
    # # Update cache logic would go here
    # _cache.clear() 
    # _cache['timestamp'] = (now, None) 
    # _cache.update({name: (now, df.to_dict(orient='split')) for name, df in fresh_dfs.items()})
    # return fresh_dfs
    # --- End Simplified --- 
    print("Downloading fresh sheet data...") # Add log message
    return _download_sheet() # Directly return fresh data

# -------- Metadata Extraction and Parsing ----------------------------

def _extract_meta_and_assets(raw_dfs: dict[str, pd.DataFrame]) -> dict[str, Any]:
    """
    Extracts metadata and cleaned asset data from raw DataFrames.
    Returns: {"meta": {...}, "assets": [...]}
    """
    sheet1_df = raw_dfs.get("Sheet1", pd.DataFrame())
    if sheet1_df.empty:
        return {"meta": {}, "assets": []}

    meta = {}

    # --- Helper to find value next to a label in specified columns ---
    def _find_value_by_label(df: pd.DataFrame, label: str, label_col_idx: int, val_col_idx: int) -> Any | None:
        try:
            # Normalize label for robust matching
            normalized_label = str(label).strip().lower()
            for index, row in df.iterrows():
                cell_label = str(row.iloc[label_col_idx]).strip().lower()
                if cell_label == normalized_label:
                    value = row.iloc[val_col_idx]
                    numeric_value = None
                    # Convert percentages (string or number) to fractions
                    if isinstance(value, str) and '%' in value:
                         numeric_value = pd.to_numeric(value.replace('%', ''), errors='coerce') / 100.0
                    # Handle cases like Momentum where value is numeric but represents percentage
                    elif isinstance(value, (int, float)) and normalized_label == "momentum": # Explicitly check for momentum
                         numeric_value = value / 100.0
                    else:
                        # Attempt direct numeric conversion for other cases
                        numeric_value = pd.to_numeric(value, errors='coerce')

                    # Return numeric if conversion successful, otherwise original value (or None if coercion failed)
                    if pd.notna(numeric_value):
                        return numeric_value
                    elif pd.isna(numeric_value) and not isinstance(value, (int,float,str)): # if coerce failed and original wasnt numeric/str
                        return None
                    else: # return original non-numeric value if potentially valid (e.g. string date)
                        return value
            return None # Label not found
        except (IndexError, KeyError):
            return None # Column index out of bounds

    # --- Extract Metadata ---
    meta['momentum'] = _find_value_by_label(sheet1_df, "Momentum", 1, 2) # Label col 1 (B), Value col 2 (C)
    meta['implied_allocation'] = _find_value_by_label(sheet1_df, "Implied Allocation", 15, 16) # Label col 15 (P), Value col 16 (Q)
    meta['gauss_mean'] = _find_value_by_label(sheet1_df, "Population Mean", 15, 16)      # Label col 15 (P), Value col 16 (Q)
    meta['gauss_sd'] = _find_value_by_label(sheet1_df, "Population SD", 15, 16)        # Label col 15 (P), Value col 16 (Q)

    # --- Extract Date (heuristic: try cell C3 (index 2, 2)) ---
    try:
        # Use iloc[2, 2] for cell C3
        date_val = sheet1_df.iloc[2, 2]
        # Attempt to parse date, converting to ISO format if successful
        parsed_date = pd.to_datetime(date_val, errors='coerce')
        meta['today'] = parsed_date.isoformat() if pd.notna(parsed_date) else None
    except IndexError:
        meta['today'] = None

    # --- Clean up None values in meta ---
    meta = {k: v for k, v in meta.items() if v is not None}

    # --- Parse Assets ---
    assets = _parse_assets(sheet1_df)

    return {"meta": meta, "assets": assets}


# -------- NEW: tidy parser ----------------------------------------
ASSET_COLS = [
    "asset", "index_value", "intrinsic_value", "overprice", "assoc_date",
    "months_to_even", "overprice_threshold", "target_allocation",
    "est_growth", "est_dividends", "est_total_return",
    "previous", "today", "change", "gaussian_estimate", "extra"
]

def _parse_assets(sheet_df: pd.DataFrame) -> list[dict]:
    """
    Convert the messy 'Sheet1' DataFrame into a list of clean dicts.
    Assumes metadata rows are handled separately or naturally filtered out.
    """
    if sheet_df.empty:
        return []

    # Find the first row that contains the first asset (heuristic: "SP500" in col B/index 1)
    asset_start_row_index = -1
    for i, row in sheet_df.iterrows():
        try:
            # Look for "sp500" case-insensitively in the second column (index 1)
            if "sp500" in str(row.iloc[1]).strip().lower():
                asset_start_row_index = i # This row is the first asset row
                break
        except IndexError:
            continue

    if asset_start_row_index == -1:
        print("Warning: Could not find asset start row ('SP500' in column B). Parsing might fail or be empty.")
        # Fallback: Maybe return empty or raise error? For now, return empty.
        # Or try a previous assumption like index 3, but it's risky:
        # asset_start_row_index = 3
        return [] # Return empty list if start not found

    # Slice the DataFrame starting FROM the detected asset row
    df = sheet_df.iloc[asset_start_row_index:].copy()

    # Filter based on first *potential* asset column (index 1) having content
    # This might be redundant now but safe to keep
    df = df[df.iloc[:, 1] != ""].reset_index(drop=True)

    # Select expected columns (B to Q, indices 1 to 16)
    if df.shape[1] < 17:
        print(f"Warning: Expected 17 columns starting from B, found {df.shape[1]}. Parsing might be incomplete.")
        num_cols_to_select = min(df.shape[1], 17)
        df = df.iloc[:, 1:num_cols_to_select]
        current_asset_cols = ASSET_COLS[:len(df.columns)]
    else:
        df = df.iloc[:, 1:17] # Selects columns B through Q
        current_asset_cols = ASSET_COLS

    df.columns = current_asset_cols

    # --- Remove Summary/Total Rows ---
    if 'asset' in df.columns:
        df = df[~df["asset"].astype(str).str.contains("TOTAL", na=False, case=False)]
        # Add filter to remove rows where 'asset' is empty or just whitespace after slicing
        df = df[df["asset"].astype(str).str.strip() != ""]
    else:
        print("Warning: 'asset' column not found after assigning names. Cannot filter summary/empty rows.")


    # --- Fix dtypes ---
    num_cols_to_convert = [
        "index_value", "intrinsic_value", "overprice", "months_to_even",
        "overprice_threshold", "target_allocation", "est_growth",
        "est_dividends", "est_total_return", "previous", "today", "change",
        "extra"
    ]
    for c in num_cols_to_convert:
        if c in df.columns:
            # Handle potential percentage strings before converting to numeric
            # (Though raw data seems to have fractions already for assets)
            # Keep this replace just in case some values are strings like '10%'
            if df[c].dtype == 'object':
                 df[c] = df[c].astype(str).str.replace('%', '', regex=False)
            df[c] = pd.to_numeric(df[c], errors='coerce')
            # REMOVED: Division by 100 for specific columns, as raw data appears to be fractions already
            # Example: if c in ["target_allocation", ...]: df[c] = df[c] / 100.0

    date_cols_to_convert = ["assoc_date"]
    for c in date_cols_to_convert:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], errors='coerce')
            # Convert valid dates to ISO strings, leave NaT as None
            df[c] = df[c].apply(lambda x: x.isoformat() if pd.notna(x) else None)

    # Replace NaN/NaT with None for JSON compatibility
    df = df.where(pd.notnull(df), None)

    # Explicitly replace Infinity/-Infinity with None as well
    df = df.replace([np.inf, -np.inf], None)

    return df.to_dict(orient="records")
# ------------------------------------------------------------------

@app.get("/")
def root():
    return {"msg": "IVDAR Sheet API — endpoints: /data (raw Sheet1), /assets (parsed)"}

@app.get("/data")
def get_sheet_data():
    """Raw dump of Sheet1 (for debugging)."""
    raw_dfs = _get_raw_dfs()
    sheet1_df = raw_dfs.get("Sheet1", pd.DataFrame())
    if not isinstance(sheet1_df, pd.DataFrame):
        print(f"Error: sheet1_df is type {type(sheet1_df)}, expected DataFrame.")
        raise HTTPException(status_code=500, detail="Internal error processing sheet data.")
    content = jsonable_encoder(sheet1_df.to_dict(orient='records'))
    return JSONResponse(content=content,
                        headers={"Cache-Control": f"max-age={CACHE_TTL}"})

@app.get("/assets")
def get_assets():
    """Returns combined metadata and cleaned assets list."""
    try:
        raw_dfs = _get_raw_dfs()
        data = _extract_meta_and_assets(raw_dfs)
        # jsonable_encoder handles datetime objects, NaNs, etc.
        # Add custom encoder to explicitly handle non-finite floats (NaN, Inf)
        content = jsonable_encoder(data, custom_encoder={float: lambda x: None if not np.isfinite(x) else x})
        return JSONResponse(content=content,
                            headers={"Cache-Control": f"max-age={CACHE_TTL}"})
    except HTTPException as e:
        # Re-raise HTTPExceptions from helpers
        raise e
    except Exception as e:
        # Catch unexpected errors during processing
        print(f"Error processing assets: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
