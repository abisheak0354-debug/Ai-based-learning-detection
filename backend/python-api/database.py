from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("DATABASE_PATH", "./data/learning_gap.sqlite3"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def connection() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db() -> None:
    with connection() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS datasets (id INTEGER PRIMARY KEY, filename TEXT NOT NULL, rows INTEGER NOT NULL, columns INTEGER NOT NULL, uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, dataset_id INTEGER NOT NULL, student_id TEXT NOT NULL, student_name TEXT NOT NULL, UNIQUE(dataset_id, student_id), FOREIGN KEY(dataset_id) REFERENCES datasets(id));
        CREATE TABLE IF NOT EXISTS performance_records (id INTEGER PRIMARY KEY, dataset_id INTEGER NOT NULL, student_id TEXT NOT NULL, subject TEXT NOT NULL, score REAL, total REAL, topic TEXT, assessment TEXT, raw_json TEXT NOT NULL, FOREIGN KEY(dataset_id) REFERENCES datasets(id));
        CREATE TABLE IF NOT EXISTS ai_analysis (id INTEGER PRIMARY KEY, dataset_id INTEGER NOT NULL, student_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(dataset_id) REFERENCES datasets(id));
        """)


def insert_dataset(filename: str, rows: int, columns: int, students: list[dict[str, Any]], records: list[dict[str, Any]]) -> int:
    with connection() as db:
        db.execute("DELETE FROM ai_analysis")
        db.execute("DELETE FROM performance_records")
        db.execute("DELETE FROM students")
        db.execute("DELETE FROM datasets")
        cursor = db.execute("INSERT INTO datasets(filename, rows, columns) VALUES (?, ?, ?)", (filename, rows, columns))
        dataset_id = int(cursor.lastrowid)
        db.executemany("INSERT INTO students(dataset_id, student_id, student_name) VALUES (?, ?, ?)", [(dataset_id, s["student_id"], s["student_name"]) for s in students])
        db.executemany("INSERT INTO performance_records(dataset_id, student_id, subject, score, total, topic, assessment, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [(dataset_id, r["student_id"], r["subject"], r["score"], r.get("total"), r.get("topic"), r.get("assessment"), json.dumps(r.get("raw", {}))) for r in records])
        return dataset_id


def dataset_info() -> dict[str, Any] | None:
    with connection() as db:
        dataset = db.execute("SELECT * FROM datasets ORDER BY id DESC LIMIT 1").fetchone()
        if not dataset:
            return None
        subjects = [row[0] for row in db.execute("SELECT DISTINCT subject FROM performance_records ORDER BY subject").fetchall()]
        return {**dict(dataset), "subjects": subjects, "student_count": db.execute("SELECT COUNT(*) FROM students WHERE dataset_id = ?", (dataset["id"],)).fetchone()[0]}
