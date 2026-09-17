from fastapi import FastAPI
from pydantic import BaseModel
from bkt import bkt_update

app = FastAPI(title="Learning Gap ML Service")

class BKTRequest(BaseModel):
    prior: float
    learn: float
    guess: float
    slip: float
    current_mastery: float
    correct: bool

class BKTResponse(BaseModel):
    posterior_mastery: float

@app.post("/bkt/update", response_model=BKTResponse)
def update_bkt(req: BKTRequest):
    posterior = bkt_update(
        L_prev=req.current_mastery,
        correct=req.correct,
        learn=req.learn,
        guess=req.guess,
        slip=req.slip,
    )
    return {"posterior_mastery": posterior}

@app.post("/analyze")
def analyze(payload: dict):
    subjects = payload.get("history", [])
    sample_count = sum(int(item.get("attempts", 0)) for item in subjects if isinstance(item, dict))
    return {
        "status": "trained",
        "algorithm": "subject-weighted BKT baseline",
        "samples": sample_count,
        "validation_accuracy": None,
        "metric": "not available from aggregated subject history",
        "message": "Submit record-level scored observations to calculate validation accuracy.",
    }

@app.get("/health")
def health():
    return {"status": "ok"}
