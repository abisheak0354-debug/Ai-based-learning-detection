from __future__ import annotations

import csv
import io
import re
from typing import Any


def clean(value: Any) -> str:
    return re.sub(r"[\s_-]", "", str(value).strip().lower())


def find_column(columns: list[str], choices: list[str]) -> str | None:
    normalized = {clean(column): column for column in columns}
    for choice in choices:
        if clean(choice) in normalized:
            return normalized[clean(choice)]
    return None


def parse_number(value: Any) -> float | None:
    try:
        text = str(value).strip().replace('%', '')
        return float(text) if text else None
    except (TypeError, ValueError):
        return None


def read_upload(content: bytes, filename: str) -> tuple[list[str], list[dict[str, Any]]]:
    try:
        if filename.lower().endswith('.csv'):
            text = content.decode('utf-8-sig')
            try:
                dialect = csv.Sniffer().sniff(text[:4096], delimiters=',;\t|')
            except csv.Error:
                dialect = csv.excel
            reader = csv.DictReader(io.StringIO(text), dialect=dialect)
            rows = [dict(row) for row in reader]
        elif filename.lower().endswith(('.xlsx', '.xls')):
            from openpyxl import load_workbook
            values = list(load_workbook(io.BytesIO(content), read_only=True, data_only=True).active.values)
            if not values:
                raise ValueError('The uploaded dataset is empty.')
            headers = [str(value).strip() for value in values[0]]
            rows = [dict(zip(headers, row)) for row in values[1:]]
        else:
            raise ValueError('Only CSV, XLS, and XLSX files are supported.')
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f'Could not read dataset: {exc}') from exc
    if not rows:
        raise ValueError('The uploaded dataset is empty.')
    return [str(column).strip() for column in rows[0].keys()], rows


def normalize(columns: list[str], rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    student_id_col = find_column(columns, ['student_id', 'studentid', 'student_number', 'id', 'user_id', 'userid', 'roll_no', 'rollno', 'registration_id'])
    student_name_col = find_column(columns, ['student_name', 'studentname', 'student', 'full_name', 'name', 'learner_name'])
    subject_col = find_column(columns, ['subject', 'subject_name', 'course', 'class_name'])
    score_col = find_column(columns, ['score', 'marks', 'mark', 'marks_obtained', 'obtained_marks', 'percentage', 'percentage_score', 'accuracy', 'mastery'])
    total_col = find_column(columns, ['total', 'total_marks', 'max_marks', 'out_of'])
    topic_col = find_column(columns, ['topic', 'unit', 'chapter'])
    assessment_col = find_column(columns, ['assessment', 'exam', 'test', 'assignment'])
    records: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        # Student identity is optional for manual score sheets.  When it is not
        # supplied, use the row as one anonymous learner rather than rejecting
        # an otherwise valid dataset.
        generated_id = f'manual-student-{index + 1}'
        student_id = str(row.get(student_id_col, '') if student_id_col else generated_id).strip() or generated_id
        student_name = str(row.get(student_name_col, '') if student_name_col else f'Student {index + 1}').strip() or f'Student {index + 1}'
        if not student_id or student_id.lower() in ('nan', 'none'):
            raise ValueError(f'Missing Student ID at row {index + 2}.')
        if subject_col and score_col:
            subject_values = [(str(row.get(subject_col, '')).strip(), row.get(score_col))]
        else:
            metadata = {student_id_col, student_name_col, topic_col, assessment_col, score_col, total_col, None}
            subject_values = [(column, row.get(column)) for column in columns if column not in metadata and parse_number(row.get(column)) is not None]
        for subject, value in subject_values:
            score = parse_number(value)
            if score is None:
                continue
            records.append({'student_id': student_id, 'student_name': student_name, 'subject': subject or 'Uncategorized', 'score': score, 'total': parse_number(row.get(total_col)) if total_col else None, 'topic': str(row.get(topic_col)) if topic_col and row.get(topic_col) else None, 'assessment': str(row.get(assessment_col)) if assessment_col and row.get(assessment_col) else None, 'raw': row})
    if not records:
        raise ValueError(f'No numeric subject scores were found. Detected columns: {", ".join(columns)}. Include a score column or numeric subject columns.')
    students = [{'student_id': student_id, 'student_name': student_name} for student_id, student_name in sorted({(record['student_id'], record['student_name']) for record in records})]
    return students, records, sorted({record['subject'] for record in records})
