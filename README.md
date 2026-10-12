# Careerly — Online Job Recruitment Platform

A full-stack educational project for the Round 3 system design challenge. It includes a responsive frontend and Flask REST API backed by SQLite.

## Features
- Responsive job search interface
- Search jobs by title, company, or location
- Browse job cards and apply through a form
- Prevent duplicate applications from the same user to the same job
- View application status and history
- Seeded sample job listings
- Architecture diagram

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python, Flask
- Database: SQLite

## Run locally
Requires Python 3.9+ and pip.

```bash
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser. The frontend and API are served by the same Flask application.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/jobs?keyword=Java` | Search jobs |
| GET | `/api/jobs/1` | Get job details |
| POST | `/api/jobs/1/applications` | Apply for a job |
| GET | `/api/applications/1/status` | Check application status |
| GET | `/api/users/10/applications` | View application history |

Example application request:

```bash
curl -X POST "http://127.0.0.1:5000/api/jobs/1/applications" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":10,\"resumeUrl\":\"https://example.com/resume.pdf\"}"
```

## Project structure

```text
job-recruitment-platform/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── architecture.svg
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Architecture
Open `architecture.svg`.

## Notes
This is a learning prototype, not a production-ready recruitment system. Authentication, authorization, actual resume upload, automated email delivery, rate limiting, and production deployment are not implemented. The frontend uses a Google Fonts import when internet access is available and falls back to local sans-serif fonts.
