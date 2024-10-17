from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Set up Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Database connection
def get_db_connection():
    conn = sqlite3.connect('llm_database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Model for LLM data
class LLM(BaseModel):
    id: int
    name: str
    provider_id: int
    provider_name: str
    provider_website: str
    release_date: str
    parameter_count: Optional[int] = None # in millions
    context_size: int
    license: str
    description: Optional[str] = None
    use_cases: Optional[str] = None
    provider_logo: Optional[str] = None

class PerformanceMetric(BaseModel):
    id: int
    model_id: int
    benchmark_name: str
    score: float
    dataset_details: Optional[str] = None

# Route for the home page
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Route for the compare page
@app.get("/compare", response_class=HTMLResponse)
async def compare(request: Request):
    return templates.TemplateResponse("compare.html", {"request": request})

# Route for the model details page
@app.get("/model/{model_id}", response_class=HTMLResponse)
async def model_details(request: Request, model_id: int):
    return templates.TemplateResponse("model.html", {"request": request, "model_id": model_id})

@app.get("/api/models", response_model=List[LLM])
async def get_models(
    provider: Optional[str] = None,
    min_params: Optional[int] = None,
    max_params: Optional[int] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT m.*, p.name as provider_name, p.website as provider_website, p.logo as provider_logo
    FROM Models m
    JOIN Providers p ON m.provider_id = p.id
    WHERE 1=1
    """
    params = []
    
    if provider:
        query += " AND p.name = ?"
        params.append(provider)
    if min_params:
        query += " AND m.parameter_count >= ?"
        params.append(min_params)
    if max_params:
        query += " AND m.parameter_count <= ?"
        params.append(max_params)
    
    cursor.execute(query, params)
    models = cursor.fetchall()
    conn.close()
    return [LLM(**dict(model)) for model in models]

@app.get("/api/models/{model_id}", response_model=LLM)
async def get_model(model_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT m.*, p.name as provider_name, p.website as provider_website
    FROM Models m
    JOIN Providers p ON m.provider_id = p.id
    WHERE m.id = ?
    """, (model_id,))
    model = cursor.fetchone()
    conn.close()
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return LLM(**dict(model))

@app.get("/api/models/{model_id}/performance", response_model=List[PerformanceMetric])
async def get_model_performance(model_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM PerformanceMetrics WHERE model_id = ?", (model_id,))
    metrics = cursor.fetchall()
    conn.close()
    return [PerformanceMetric(**dict(metric)) for metric in metrics]

@app.get("/api/compare", response_model=List[LLM])
async def compare_models(model_ids: List[int] = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ','.join('?' * len(model_ids))
    cursor.execute(f"SELECT * FROM Models WHERE id IN ({placeholders})", model_ids)
    models = cursor.fetchall()
    conn.close()
    return [LLM(**dict(model)) for model in models]

# Add more endpoints here as needed

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
