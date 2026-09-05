# SereneMind ERD

This ERD reflects the SQLite schema currently created in `server/database/sqlite.js`.

```mermaid
erDiagram
    Users {
        INTEGER id PK
        TEXT username UK
        TEXT email UK
        TEXT password_hash
        DATETIME created_at
    }

    Chat_Sessions {
        INTEGER id PK
        INTEGER user_id FK
        TEXT title
        DATETIME created_at
    }

    Sessions {
        INTEGER id PK
        INTEGER user_id FK
        TEXT sender
        TEXT content
        TEXT risk_level
        DATETIME timestamp
        INTEGER session_id FK
    }

    Mood_Logs {
        INTEGER id PK
        INTEGER user_id FK
        INTEGER mood_score
        TEXT notes
        DATE date
    }

    Assessments {
        INTEGER id PK
        INTEGER user_id FK_UK
        TEXT answers
        INTEGER depression_score
        INTEGER anxiety_score
        INTEGER stress_score
        INTEGER total_score
        TEXT main_concern
        BOOLEAN self_harm_risk
        DATETIME timestamp
    }

    Patient_Reports {
        INTEGER id PK
        INTEGER patient_id FK
        TEXT report_title
        TEXT report_content
        TEXT doctor_comments
        BOOLEAN is_reviewed
        DATETIME created_at
    }

    Users ||--o{ Chat_Sessions : creates
    Users ||--o{ Sessions : sends_or_receives
    Chat_Sessions ||--o{ Sessions : contains
    Users ||--o{ Mood_Logs : records
    Users ||--o| Assessments : completes
    Users ||--o{ Patient_Reports : has
```

## Relationship summary

- One user can have many chat sessions.
- One chat session can contain many chat messages in `Sessions`.
- One user can have many mood logs.
- One user can have zero or one assessment because `Assessments.user_id` is unique.
- One user can have many patient reports through `Patient_Reports.patient_id`.

## Important implementation note

The route code currently expects some fields and tables that are not present in the SQLite schema above:

- `server/routes/reports.js` uses `doctor_id`, `status`, and a `Doctors` table, but these are not defined in `Patient_Reports` or the schema.
- `server/routes/doctor.js` queries `Assessments.severity` and `Assessments.crisis_risk`, but the schema defines `main_concern` and `self_harm_risk` instead.

So this ERD matches the implemented database schema, not every assumption currently present in route queries.
