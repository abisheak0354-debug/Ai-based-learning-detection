from __future__ import annotations

import json
import os
from typing import Any


def gemini_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def fallback_analysis(profile: dict[str, Any]) -> dict[str, Any]:
    gaps = profile.get("learning_gaps", [])
    strengths = profile.get("strengths", [])
    priorities = profile.get("priority_areas", [])
    return {"summary": f"{profile['student_name']} has an overall average of {profile['overall_average']}% based only on uploaded records." if profile.get("overall_average") is not None else "Insufficient data to determine overall performance.", "strengths": strengths, "learning_gaps": gaps, "priority_areas": priorities, "recommendations": [f"Review {subject} using targeted practice from the uploaded evidence." for subject in priorities[:3]] or ["Insufficient data to determine a recommendation."], "confidence_note": "Statistical analysis is derived from uploaded subject scores. Topic-level conclusions require topic-level data."}


def analyze_with_gemini(profile: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return fallback_analysis(profile)
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = """You are an educational performance-analysis assistant. Analyze ONLY the supplied uploaded student data. Do not invent subjects, topics, causes, or recommendations. If topic-level data is unavailable, say insufficient data. Return JSON with exactly: summary, strengths, learning_gaps, priority_areas, recommendations, confidence_note.\n\nStudent data:\n""" + json.dumps(profile)
        response = client.models.generate_content(model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"), contents=prompt, config={"response_mime_type": "application/json"})
        result = json.loads(response.text or "{}")
        fallback = fallback_analysis(profile)
        return {key: result.get(key, fallback[key]) for key in fallback}
    except Exception:
        fallback = fallback_analysis(profile)
        fallback["confidence_note"] += " AI analysis temporarily unavailable; showing evidence-based statistical analysis."
        return fallback


def chat_with_gemini(profile: dict[str, Any], message: str, fallback_message: str) -> tuple[str, str]:
    """Answer a student-data question with Gemini when configured, otherwise local evidence."""
    if not gemini_configured():
        return fallback_message, "local"
    try:
        from google import genai
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        prompt = """You are a learning-support assistant. Answer the user's question using ONLY the supplied student profile. Be concise, practical, and clear about missing evidence. Do not invent scores, subjects, causes, or outcomes.\n\nStudent profile:\n""" + json.dumps(profile) + "\n\nUser question:\n" + message
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            contents=prompt,
        )
        answer = (response.text or "").strip()
        return (answer, "gemini") if answer else (fallback_message, "local")
    except Exception:
        return fallback_message, "local"
