from __future__ import annotations

import os
import random
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from database import connection, dataset_info, init_db, insert_dataset
from dataset_processor import normalize, read_upload
from gemini_ai import analyze_with_gemini, chat_with_gemini, gemini_configured
from performance_analyzer import profile_for, train_and_evaluate
from schemas import ChatRequest

load_dotenv()
init_db()
app = FastAPI(title="AI-Based Learning Gap Detection System", version="1.0.0")
origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://localhost:3000").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def require_dataset() -> int:
    info = dataset_info()
    if not info:
        raise HTTPException(404, "No dataset uploaded. Upload a CSV or Excel file first.")
    return int(info["id"])


def records_for(dataset_id: int) -> list[dict[str, Any]]:
    with connection() as db:
        return [dict(row) for row in db.execute("SELECT id, student_id, subject, score, total, topic, assessment FROM performance_records WHERE dataset_id = ? ORDER BY student_id, subject, id", (dataset_id,)).fetchall()]


def training_result(dataset_id: int) -> dict[str, Any]:
    return train_and_evaluate(records_for(dataset_id))


def dataset_analysis(dataset_id: int, filename: str, rows: int) -> dict[str, Any]:
    profiles = [get_student(student["student_id"])["data"] for student in student_rows(dataset_id)]
    first = profiles[0] if profiles else None
    training = training_result(dataset_id)
    validation_accuracy = training["validation_accuracy"]
    return {"fileName": filename, "rows": rows, "subjects": first["subjects"] if first else [], "weakestSubject": first["learning_gaps"][0] if first and first["learning_gaps"] else (first["subjects"][0]["subject"] if first else "Upload a dataset"), "modelAccuracy": round(validation_accuracy * 100, 1) if validation_accuracy is not None else None, "profiles": profiles, "training": training}


def demo_dataset(student_count: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    randomizer = random.Random(20260917)
    subjects = ["Mathematics", "Physics", "English", "Computer Science"]
    students: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []
    for number in range(1, student_count + 1):
        student_id = f"STU-{number:04d}"
        students.append({"student_id": student_id, "student_name": f"Student {number}"})
        weak_subject = subjects[(number - 1) % len(subjects)]
        for subject in subjects:
            first_score = randomizer.randint(35, 52) if subject == weak_subject else randomizer.randint(70, 92)
            second_score = min(98, max(30, first_score + randomizer.randint(-3, 5)))
            for assessment, score in (("Assessment 1", first_score), ("Assessment 2", second_score)):
                records.append({"student_id": student_id, "student_name": f"Student {number}", "subject": subject, "score": score, "total": 100, "topic": None, "assessment": assessment, "raw": {"generated": True}})
    return students, records


def student_rows(dataset_id: int) -> list[dict[str, Any]]:
    with connection() as db:
        return [dict(row) for row in db.execute("SELECT student_id, student_name FROM students WHERE dataset_id = ? ORDER BY student_name", (dataset_id,)).fetchall()]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "fastapi-learning-gap"}


@app.get("/ai/status")
def ai_status() -> dict[str, Any]:
    return {"success": True, "data": {"provider": "gemini" if gemini_configured() else "local", "gemini_configured": gemini_configured(), "chat_endpoint": "/ai/chat"}}


@app.post("/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    try:
        columns, rows = read_upload(content, file.filename or "upload.csv")
        students, records, subjects = normalize(columns, rows)
        dataset_id = insert_dataset(file.filename or "upload", len(rows), len(columns), students, records)
        return {"success": True, "data": {"id": dataset_id, "filename": file.filename, "rows": len(rows), "columns": len(columns), "students": len(students), "subjects": subjects, "message": "Dataset uploaded successfully."}}
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/demo/generate/{student_count}")
def generate_demo_dataset(student_count: int) -> dict[str, Any]:
    if student_count < 10 or student_count > 1000:
        raise HTTPException(400, "Choose between 10 and 1000 demo students.")
    students, records = demo_dataset(student_count)
    dataset_id = insert_dataset(f"generated-{student_count}-student-dataset.csv", len(records), 5, students, records)
    return {"success": True, "data": dataset_analysis(dataset_id, f"Generated {student_count}-student dataset", len(records))}


@app.get("/dataset/info")
def get_dataset_info() -> dict[str, Any]:
    info = dataset_info()
    if not info:
        raise HTTPException(404, "No dataset uploaded.")
    return {"success": True, "data": info}


@app.get("/students")
def get_students() -> dict[str, Any]:
    dataset_id = require_dataset()
    return {"success": True, "data": student_rows(dataset_id)}


@app.get("/students/search/{name}")
def search_students(name: str) -> dict[str, Any]:
    dataset_id = require_dataset()
    matches = [student for student in student_rows(dataset_id) if name.lower() in student["student_name"].lower() or name.lower() in student["student_id"].lower()]
    return {"success": True, "data": matches}


@app.get("/students/{student_id}")
def get_student(student_id: str) -> dict[str, Any]:
    dataset_id = require_dataset()
    student = next((item for item in student_rows(dataset_id) if item["student_id"].lower() == student_id.lower()), None)
    if not student:
        raise HTTPException(404, "Student not found in the uploaded dataset.")
    return {"success": True, "data": profile_for(student["student_id"], student["student_name"], records_for(dataset_id))}


@app.get("/analytics/overview")
def analytics_overview() -> dict[str, Any]:
    dataset_id = require_dataset()
    profiles = [profile_for(student["student_id"], student["student_name"], records_for(dataset_id)) for student in student_rows(dataset_id)]
    averages = [profile["overall_average"] for profile in profiles if profile["overall_average"] is not None]
    return {"success": True, "data": {"total_students": len(profiles), "average_performance": round(sum(averages) / len(averages), 1) if averages else None, "students_needing_attention": sum(bool(profile["learning_gaps"]) for profile in profiles), "top_performing_students": sorted(profiles, key=lambda profile: profile["overall_average"] or 0, reverse=True)[:5]}}


@app.get("/analytics/student/{student_id}")
def student_analytics(student_id: str) -> dict[str, Any]:
    return get_student(student_id)


@app.post("/ai/analyze/{student_id}")
def ai_analysis(student_id: str) -> dict[str, Any]:
    dataset_id = require_dataset()
    student = next((item for item in student_rows(dataset_id) if item["student_id"].lower() == student_id.lower()), None)
    if not student:
        raise HTTPException(404, "Student not found in the uploaded dataset.")
    profile = profile_for(student["student_id"], student["student_name"], records_for(dataset_id))
    result = analyze_with_gemini(profile)
    with connection() as db:
        db.execute("INSERT INTO ai_analysis(dataset_id, student_id, payload) VALUES (?, ?, ?)", (dataset_id, student_id, str(result)))
    return {"success": True, "data": result}


@app.post("/ai/chat")
def ai_chat(request: ChatRequest) -> dict[str, Any]:
    profile = request.profile.model_dump() if request.profile else None
    if not profile and request.student_id:
        profile = get_student(request.student_id)["data"]
    if not profile:
        raise HTTPException(400, "Select a student from the uploaded dataset first.")
    analysis = analyze_with_gemini(profile)
    training = training_result(require_dataset()) if request.mode == "train" else None
    question = request.message.lower()
    strongest = profile["strengths"][0] if profile.get("strengths") else "Insufficient data to determine a strong area."
    weakest = profile["learning_gaps"][0] if profile.get("learning_gaps") else (profile["priority_areas"][-1] if profile.get("priority_areas") else "Insufficient data to determine a lagging subject.")
    if "strong" in question or "best" in question:
        message = f"{profile['student_name']}'s strongest available area is {strongest}. This is based on the highest classified subject score in the uploaded dataset."
    elif "accur" in question or "average" in question or "overall" in question:
        message = f"{profile['student_name']}'s calculated overall average is {profile['overall_average']}% and the performance level is {profile['performance_level']}."
    else:
        message = f"{profile['student_name']}'s lagging subject is {weakest}. Priority areas from the uploaded data: {', '.join(profile['priority_areas']) or 'Insufficient data to determine this.'}."
    message, provider = chat_with_gemini(profile, request.message, message)
    return {"success": True, "data": {"message": message, "analysis": analysis, "profile": profile, "mode": request.mode, "training": training, "provider": provider}}


@app.post("/datasets/analyze")
async def frontend_upload_alias(file: UploadFile = File(...)) -> dict[str, Any]:
    result = await upload_dataset(file)
    info = result["data"]
    return {"success": True, "data": dataset_analysis(info["id"], info["filename"], info["rows"])}
