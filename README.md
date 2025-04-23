# IVDAR Web Application Backend

This directory contains the backend API server for the Intrinsic Value Dynamic Asset Reallocation (IVDAR) web application.

## Overview

The backend is a Python application built using the **FastAPI** framework. Its primary responsibilities are:

1.  **Fetching Data:** It downloads financial data from a publicly published Google Sheet.
2.  **Processing Data:** It uses the **pandas** library to parse the Excel data downloaded from the sheet, clean it, and extract relevant metadata and asset information.
3.  **Serving Data:** It exposes API endpoints (specifically `/data` for raw data and `/assets` for processed data) that the frontend JavaScript application can call to retrieve the necessary information for display.

## Running the Backend Server

To run the backend API server locally, you need Python and the required libraries installed (see `app.py` requirements comment). The server is run using **Uvicorn**, an ASGI server.

You can run the server using one of the following commands from the project's root directory:

### Standard Mode

```bash
python -m uvicorn app:app --port 8000
```

*   `python -m uvicorn`: Executes the Uvicorn module.
*   `app:app`: Tells Uvicorn where to find the FastAPI application instance. It looks for an object named `app` inside the file `app.py`.
*   `--port 8000`: Specifies that the server should listen for requests on port 8000.

In this mode, the server loads the application code once at startup. If you make changes to `app.py`, you will need to stop the server (usually with `Ctrl+C`) and restart it to see the changes take effect.

### Reload Mode

```bash
python -m uvicorn app:app --reload --port 8000
```

*   `--reload`: This flag enables auto-reloading.

This command does the same thing as the standard mode command, but with the addition of the `--reload` flag. When `--reload` is active, Uvicorn watches the project files (like `app.py`) for changes. If it detects a change, it automatically restarts the server process, loading the updated code.

**Difference:**

The key difference is the `--reload` flag. Use the **reload mode (`--reload`)** during development, as it saves you the effort of manually restarting the server every time you modify the backend code. Use the **standard mode** (without `--reload`) for more stable environments or when you are not actively changing the backend code, as it avoids the overhead of file monitoring.

Once the server is running, the API will typically be accessible at `http://localhost:8000` (or `http://127.0.0.1:8000`). The frontend application (`script.js`) is configured to fetch data from this address. 

IVDAR Sheet API
http://127.0.0.1:8000/docs#/default/get_assets_assets_get