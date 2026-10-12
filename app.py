from flask import Flask, jsonify, request, send_from_directory
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
DB_PATH = ROOT / "jobs.db"

app = Flask(__name__)

def connect_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with connect_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            resume_url TEXT,
            status TEXT NOT NULL DEFAULT 'Applied',
            FOREIGN KEY(job_id) REFERENCES jobs(id)
        );
        """)
        if conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO jobs (title, company, location, description) VALUES (?, ?, ?, ?)",
                [
                    ("Java Developer", "ABC Technologies", "Chennai", "Develop and maintain Java applications, collaborate with product teams, and write reliable code."),
                    ("Data Analyst", "Bright Data", "Coimbatore", "Analyze datasets, build reports, and help teams make data-informed decisions."),
                    ("Python Developer", "CloudNova", "Bengaluru", "Build backend services and APIs using Python and modern development practices."),
                    ("Frontend Developer", "PixelWorks", "Remote", "Create accessible, responsive web interfaces using HTML, CSS, and JavaScript.")
                ]
            )

@app.get("/")
def frontend_home():
    return send_from_directory(FRONTEND, "index.html")

@app.get("/frontend/<path:filename>")
def frontend_files(filename):
    return send_from_directory(FRONTEND, filename)

@app.get("/api")
def api_info():
    return jsonify({
        "message": "Job Recruitment Platform API",
        "endpoints": [
            "GET /api/jobs?keyword=Java",
            "GET /api/jobs/<job_id>",
            "POST /api/jobs/<job_id>/applications",
            "GET /api/applications/<application_id>/status",
            "GET /api/users/<user_id>/applications"
        ]
    })

@app.get("/api/jobs")
def search_jobs():
    keyword = request.args.get("keyword", "").strip()
    with connect_db() as conn:
        rows = conn.execute(
            """SELECT * FROM jobs
               WHERE title LIKE ? OR company LIKE ? OR location LIKE ?
               ORDER BY id""",
            (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%")
        ).fetchall()
    return jsonify([dict(row) for row in rows]), 200

@app.get("/api/jobs/<int:job_id>")
def get_job(job_id):
    with connect_db() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(dict(row)), 200

@app.post("/api/jobs/<int:job_id>/applications")
def apply_for_job(job_id):
    data = request.get_json(silent=True) or {}
    user_id = data.get("userId")
    resume_url = data.get("resumeUrl", "")
    if not isinstance(user_id, int) or user_id <= 0:
        return jsonify({"error": "Enter a valid positive user ID"}), 400

    with connect_db() as conn:
        if conn.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone() is None:
            return jsonify({"error": "Job not found"}), 404
        existing = conn.execute(
            "SELECT id FROM applications WHERE job_id = ? AND user_id = ?",
            (job_id, user_id)
        ).fetchone()
        if existing:
            return jsonify({"error": "You have already applied for this job"}), 409
        cursor = conn.execute(
            "INSERT INTO applications (job_id, user_id, resume_url) VALUES (?, ?, ?)",
            (job_id, user_id, resume_url)
        )
        application_id = cursor.lastrowid

    return jsonify({
        "applicationId": application_id,
        "jobId": job_id,
        "userId": user_id,
        "status": "Applied",
        "message": "Application submitted successfully"
    }), 201

@app.get("/api/applications/<int:application_id>/status")
def application_status(application_id):
    with connect_db() as conn:
        row = conn.execute(
            "SELECT id, job_id, user_id, status FROM applications WHERE id = ?",
            (application_id,)
        ).fetchone()
    if row is None:
        return jsonify({"error": "Application not found"}), 404
    return jsonify({
        "applicationId": row["id"],
        "jobId": row["job_id"],
        "userId": row["user_id"],
        "status": row["status"]
    }), 200

@app.get("/api/users/<int:user_id>/applications")
def application_history(user_id):
    with connect_db() as conn:
        rows = conn.execute("""
            SELECT a.id AS applicationId, a.status, a.job_id AS jobId,
                   j.title AS jobTitle, j.company, j.location
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.user_id = ?
            ORDER BY a.id DESC
        """, (user_id,)).fetchall()
    return jsonify({"userId": user_id, "applications": [dict(row) for row in rows]}), 200

init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
