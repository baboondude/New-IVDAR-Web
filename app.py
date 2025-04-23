# ── requirements ─────────────────────────────────────────
# pip install fastapi uvicorn pandas requests openpyxl
# --------------------------------------------------------
import io, re, time, requests, pandas as pd
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

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

_cache: dict[str, tuple[float, dict]] = {}   # tab-name → (timestamp, JSON-rows)

def _xlsx_endpoint(url: str) -> str:
    # /pubhtml … → /pub?output=xlsx  (documented trick) :contentReference[oaicite:1]{index=1}
    return re.sub(r"/pubhtml.*", "/pub?output=xlsx", url, flags=re.I)

def _download_sheet() -> dict[str, pd.DataFrame]:
    """Return {tab_name: DataFrame} with the first row as header."""
    resp = requests.get(_xlsx_endpoint(PUBLISHED_URL), timeout=30)
    if resp.status_code != 200:
        raise HTTPException(502, f"Google responded {resp.status_code}")
    book = pd.ExcelFile(io.BytesIO(resp.content))

    result: dict[str, pd.DataFrame] = {}
    for name in book.sheet_names:
        result[name] = book.parse(name, header=None).fillna("")
    return result

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
    """
    if sheet_df.empty:
        return []
    # Assume data starts at the 3rd row (index 2)
    df = sheet_df.iloc[2:].copy()
    # Keep rows where the second column (potential asset name) is not blank
    df = df[df.iloc[:, 1] != ""].reset_index(drop=True)

    # Ensure we have enough columns before selecting
    if df.shape[1] < 17:
        # Handle error: not enough columns found. Maybe log this.
        print(f"Warning: Expected at least 17 columns, found {df.shape[1]}. Parsing might fail.")
        # Return empty or partially processed data depending on requirements
        return []

    # Select columns 1 through 16 (Python slicing is end-exclusive for iloc)
    df = df.iloc[:, 1:17] # Selects columns with index 1 up to (but not including) 17
    df.columns = ASSET_COLS # Assign new column names

    # Remove trailing rows that are summaries or momentum lines
    df = df[~df["asset"].astype(str).str.contains("Momentum", na=False)]
    df = df[~df["asset"].astype(str).str.contains("TOTAL", na=False)] # Also remove totals

    # Fix dtypes where possible
    num_cols = [
        "index_value", "intrinsic_value", "overprice", "months_to_even",
        "overprice_threshold", "target_allocation", "est_growth",
        "est_dividends", "est_total_return", "previous", "today", "change",
        # Add others if they should be numeric, handle potential errors
    ]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce') # Coerce errors to NaN

    # Convert non-numeric columns that might contain dates, handle errors
    date_cols = ["assoc_date"]
    for c in date_cols:
        if c in df.columns:
            # Attempt to convert to datetime, then format. Coerce errors to NaT.
            df[c] = pd.to_datetime(df[c], errors='coerce')
            # jsonable_encoder will handle datetime, or format explicitly if needed:
            # df[c] = df[c].dt.strftime('%Y-%m-%d').fillna("") # Example format

    # Replace NaN from coercion with None or empty string for JSON compatibility
    df = df.fillna('') # Or use df.where(pd.notnull(df), None) for None

    return df.to_dict(orient="records")
# ------------------------------------------------------------------

@app.get("/")
def root():
    return {"msg": "IVDAR Sheet API — endpoints: /data (raw Sheet1), /assets (parsed)"}

@app.get("/data")
def get_sheet_data():
    """Raw dump of Sheet1 (for debugging)."""
    raw_dfs = _get_raw_dfs()
    sheet1_df = raw_dfs.get("Sheet1", pd.DataFrame()) # Get Sheet1 or empty DF
    # --- Add check --- 
    if not isinstance(sheet1_df, pd.DataFrame):
        print(f"Error: sheet1_df is type {type(sheet1_df)}, expected DataFrame.")
        raise HTTPException(status_code=500, detail="Internal error processing sheet data.")
    # --- End check --- 
    # Use jsonable_encoder to handle potential non-serializable types in raw data
    content = jsonable_encoder(sheet1_df.to_dict(orient='records'))
    return JSONResponse(content=content,
                        headers={"Cache-Control": f"max-age={CACHE_TTL}"})

@app.get("/assets")
def get_assets():
    """Clean, field-named assets list ready for charts."""
    raw_dfs = _get_raw_dfs()
    sheet1_df = raw_dfs.get("Sheet1", pd.DataFrame())
    clean_assets = _parse_assets(sheet1_df)
    # Use jsonable_encoder here too for consistency, handles NaNs, datetimes etc.
    content = jsonable_encoder(clean_assets)
    return JSONResponse(content=content,
                        headers={"Cache-Control": f"max-age={CACHE_TTL}"})
