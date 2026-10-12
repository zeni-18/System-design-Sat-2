const jobsList = document.getElementById("jobs-list");
const jobCount = document.getElementById("job-count");
const searchForm = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const dialog = document.getElementById("apply-dialog");
const applyForm = document.getElementById("apply-form");
const toast = document.getElementById("toast");

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function renderJobs(jobs) {
  jobCount.textContent = `${jobs.length} ${jobs.length === 1 ? "role" : "roles"} found`;
  if (!jobs.length) {
    jobsList.innerHTML = '<div class="empty-card">No roles found. Try another keyword.</div>';
    return;
  }
  jobsList.innerHTML = jobs.map(job => `
    <article class="job-card">
      <div class="job-card-top">
        <div class="company-icon">${escapeHtml((job.company || "J").slice(0, 1).toUpperCase())}</div>
        <div><h3 class="job-title">${escapeHtml(job.title)}</h3><div class="company-name">${escapeHtml(job.company)}</div></div>
      </div>
      <p class="job-description">${escapeHtml(job.description)}</p>
      <div class="job-meta"><span>⌖ ${escapeHtml(job.location)}</span><span>Full-time</span><span>Entry / Mid-level</span></div>
      <div class="job-card-bottom"><small>Job ID: ${job.id}</small><button class="apply-btn" data-apply="${job.id}" data-title="${escapeHtml(job.title)}">Apply now ↗</button></div>
    </article>`).join("");
}

async function loadJobs(keyword = "") {
  jobsList.innerHTML = '<div class="loading-card">Finding opportunities for you…</div>';
  try {
    const jobs = await api(`/api/jobs?keyword=${encodeURIComponent(keyword)}`);
    renderJobs(jobs);
  } catch (error) {
    jobsList.innerHTML = `<div class="empty-card">${escapeHtml(error.message)} Make sure the Flask server is running.</div>`;
    jobCount.textContent = "Could not load roles";
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  loadJobs(keywordInput.value.trim());
});

document.querySelectorAll("[data-keyword]").forEach(button => {
  button.addEventListener("click", () => {
    keywordInput.value = button.dataset.keyword;
    loadJobs(button.dataset.keyword);
  });
});

jobsList.addEventListener("click", event => {
  const button = event.target.closest("[data-apply]");
  if (!button) return;
  document.getElementById("apply-job-id").value = button.dataset.apply;
  document.getElementById("apply-job-name").textContent = button.dataset.title;
  document.getElementById("apply-user-id").value = document.getElementById("user-id").value || 10;
  document.getElementById("apply-message").textContent = "";
  document.getElementById("apply-message").className = "form-message";
  dialog.showModal();
});

document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

applyForm.addEventListener("submit", async event => {
  event.preventDefault();
  const jobId = document.getElementById("apply-job-id").value;
  const userId = Number(document.getElementById("apply-user-id").value);
  const resumeUrl = document.getElementById("resume-url").value.trim();
  const message = document.getElementById("apply-message");
  const button = applyForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Submitting…";
  try {
    const result = await api(`/api/jobs/${jobId}/applications`, {
      method: "POST",
      body: JSON.stringify({ userId, resumeUrl })
    });
    message.className = "form-message success";
    message.textContent = `Application #${result.applicationId} submitted successfully!`;
    document.getElementById("user-id").value = userId;
    await loadHistory(userId);
    showToast("Application submitted successfully");
    window.setTimeout(() => dialog.close(), 1200);
  } catch (error) {
    message.className = "form-message error";
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Submit application <span>→</span>';
  }
});

async function loadHistory(userId) {
  const history = document.getElementById("history-list");
  history.innerHTML = '<p class="muted">Loading your applications…</p>';
  try {
    const result = await api(`/api/users/${encodeURIComponent(userId)}/applications`);
    if (!result.applications.length) {
      history.innerHTML = '<p class="muted">No applications found for this user ID yet. Apply for a role to see it here.</p>';
      return;
    }
    history.innerHTML = result.applications.map(item => `
      <div class="history-row">
        <div><strong>${escapeHtml(item.jobTitle)}</strong><p>${escapeHtml(item.company)} · ${escapeHtml(item.location)} · Application #${item.applicationId}</p></div>
        <span class="status-pill">${escapeHtml(item.status)}</span>
      </div>`).join("");
  } catch (error) {
    history.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

document.getElementById("history-form").addEventListener("submit", event => {
  event.preventDefault();
  loadHistory(Number(document.getElementById("user-id").value));
});

loadJobs();
