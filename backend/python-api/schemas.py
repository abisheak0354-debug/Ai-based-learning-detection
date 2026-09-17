from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class SubjectAnalysis(BaseModel):
    subject: str
    score: float | None
    percentage: float | None
    status: str
    evidence: str
    topic: str | None = None
    assessment: str | None = None


class StudentProfile(BaseModel):
    student_id: str
    student_name: str
    overall_average: float | None
    performance_level: str
    subjects: list[SubjectAnalysis]
    strengths: list[str]
    learning_gaps: list[str]
    priority_areas: list[str]


class AIAnalysis(BaseModel):
    summary: str
    strengths: list[str] = Field(default_factory=list)
    learning_gaps: list[str] = Field(default_factory=list)
    priority_areas: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    confidence_note: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    student_id: str | None = None
    student_name: str | None = None
    profile: StudentProfile | None = None
    mode: str = "predict"
    context: dict[str, Any] = Field(default_factory=dict)
