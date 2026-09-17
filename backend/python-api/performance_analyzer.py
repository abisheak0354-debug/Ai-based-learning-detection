from __future__ import annotations

import os
from collections import defaultdict
from typing import Any

THRESHOLDS = {
    "excellent": float(os.getenv("MIN_EXCELLENT_SCORE", "90")),
    "good": float(os.getenv("MIN_GOOD_SCORE", "75")),
    "moderate": float(os.getenv("MIN_MODERATE_SCORE", "60")),
    "needs_improvement": float(os.getenv("MIN_NEEDS_IMPROVEMENT_SCORE", "40")),
}


def classify(score: float) -> str:
    if score >= THRESHOLDS["excellent"]:
        return "Excellent"
    if score >= THRESHOLDS["good"]:
        return "Good"
    if score >= THRESHOLDS["moderate"]:
        return "Moderate"
    if score >= THRESHOLDS["needs_improvement"]:
        return "Needs Improvement"
    return "Learning Gap"


def train_and_evaluate(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Evaluate a simple subject-mean predictor with leave-one-out validation.

    Each record is held out once.  The predictor only sees the other uploaded
    records, using the subject mean where possible and the overall mean as a
    fallback.  Accuracy is the percentage of held-out records for which the
    predicted performance band matches the actual band.  This intentionally
    avoids reporting a made-up accuracy when there is not enough data.
    """
    usable = [record for record in records if record.get("score") is not None]
    by_student_subject: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for record in usable:
        by_student_subject[(str(record["student_id"]), str(record["subject"]))].append(record)

    # When repeated assessments exist, predict each student's latest score
    # from their earlier scores in the same subject.  This is the validation
    # that best matches the product's "next score" forecast.
    repeated_histories = [history for history in by_student_subject.values() if len(history) >= 2]
    if len(repeated_histories) >= 10:
        correct_predictions = 0
        for history in repeated_histories:
            ordered = sorted(history, key=lambda record: int(record.get("id", 0)))
            predicted_score = sum(float(record["score"]) for record in ordered[:-1]) / (len(ordered) - 1)
            if classify(predicted_score) == classify(float(ordered[-1]["score"])):
                correct_predictions += 1
        accuracy = correct_predictions / len(repeated_histories)
        return {
            "status": "trained",
            "samples": len(usable),
            "validation_accuracy": round(accuracy, 4),
            "metric": "next-assessment performance-band accuracy",
            "correct_predictions": correct_predictions,
            "validation_samples": len(repeated_histories),
        }

    if len(usable) < 10:
        return {
            "status": "insufficient-data",
            "samples": len(usable),
            "validation_accuracy": None,
            "metric": "leave-one-out performance-band accuracy",
            "message": "At least 10 scored records or 10 repeated subject assessments are required for validation accuracy.",
        }

    correct_predictions = 0
    for held_out_index, held_out in enumerate(usable):
        training_records = usable[:held_out_index] + usable[held_out_index + 1:]
        subject_scores = [float(record["score"]) for record in training_records if record["subject"] == held_out["subject"]]
        training_scores = [float(record["score"]) for record in training_records]
        predicted_score = sum(subject_scores) / len(subject_scores) if subject_scores else sum(training_scores) / len(training_scores)
        if classify(predicted_score) == classify(float(held_out["score"])):
            correct_predictions += 1

    accuracy = correct_predictions / len(usable)
    return {
        "status": "trained",
        "samples": len(usable),
        "validation_accuracy": round(accuracy, 4),
        "metric": "leave-one-out performance-band accuracy",
        "correct_predictions": correct_predictions,
        "validation_samples": len(usable),
    }


def forecast_next_score(student_id: str, subject: str, subject_records: list[dict[str, Any]], all_records: list[dict[str, Any]]) -> dict[str, Any]:
    """Forecast the next score using only the uploaded student's history and cohort data."""
    own_subject_scores = [float(record["score"]) for record in subject_records if record.get("score") is not None]
    other_student_scores = [float(record["score"]) for record in all_records if record["student_id"] == student_id and record["subject"] != subject and record.get("score") is not None]
    cohort_scores = [float(record["score"]) for record in all_records if record["student_id"] != student_id and record["subject"] == subject and record.get("score") is not None]

    components: list[tuple[float, float]] = []
    if own_subject_scores:
        components.append((sum(own_subject_scores) / len(own_subject_scores), 0.65))
    if other_student_scores:
        components.append((sum(other_student_scores) / len(other_student_scores), 0.25))
    if cohort_scores:
        components.append((sum(cohort_scores) / len(cohort_scores), 0.10))

    predicted = sum(value * weight for value, weight in components) / sum(weight for _, weight in components)
    confidence = min(95, 35 + len(own_subject_scores) * 14 + len(other_student_scores) * 3 + len(cohort_scores) * 2)
    return {
        "next_score": round(predicted, 1),
        "performance_level": classify(predicted),
        "confidence": round(confidence),
        "evidence": {
            "student_subject_records": len(own_subject_scores),
            "student_other_subject_records": len(other_student_scores),
            "same_subject_cohort_records": len(cohort_scores),
        },
    }


def student_prediction_accuracy(student_id: str, records: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Validate this student's next-score forecasts against their latest assessments."""
    histories: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record["student_id"] == student_id and record.get("score") is not None:
            histories[str(record["subject"])].append(record)

    errors: list[float] = []
    for history in histories.values():
        if len(history) < 2:
            continue
        ordered = sorted(history, key=lambda record: int(record.get("id", 0)))
        predicted = sum(float(record["score"]) for record in ordered[:-1]) / (len(ordered) - 1)
        errors.append(abs(predicted - float(ordered[-1]["score"])))
    if not errors:
        return None
    mean_absolute_error = sum(errors) / len(errors)
    return {"score": round(max(0, 100 - mean_absolute_error), 1), "samples": len(errors), "metric": "next-assessment score accuracy"}


def profile_for(student_id: str, student_name: str, records: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record["student_id"] == student_id:
            grouped[record["subject"]].append(record)
    subjects = []
    for subject, subject_records in grouped.items():
        scores = [float(record["score"]) for record in subject_records]
        score = round(sum(scores) / len(scores), 1)
        status = classify(score)
        subjects.append({"subject": subject, "score": score, "percentage": score, "status": status, "evidence": f"Calculated from {len(scores)} uploaded record(s).", "prediction": forecast_next_score(student_id, subject, subject_records, records), "topic": subject_records[0].get("topic"), "assessment": subject_records[0].get("assessment")})
    subjects.sort(key=lambda item: item["score"] if item["score"] is not None else -1, reverse=True)
    scores = [item["score"] for item in subjects if item["score"] is not None]
    strengths = [item["subject"] for item in subjects if item["status"] in ("Excellent", "Good")]
    gaps = [item["subject"] for item in subjects if item["status"] in ("Needs Improvement", "Learning Gap")]
    priorities = [item["subject"] for item in sorted(subjects, key=lambda item: item["score"] if item["score"] is not None else 101)]
    return {"student_id": student_id, "student_name": student_name, "overall_average": round(sum(scores) / len(scores), 1) if scores else None, "performance_level": classify(sum(scores) / len(scores)) if scores else "Insufficient data", "subjects": subjects, "strengths": strengths, "learning_gaps": gaps, "priority_areas": priorities[:3], "prediction_accuracy": student_prediction_accuracy(student_id, records)}
