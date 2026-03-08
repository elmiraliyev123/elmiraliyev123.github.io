const ADMIN_HASH = "1b1edbf9315d0bb3e53595eb48b719e513e046f6cc70dec4cc49a16cebd6f621";
const SESSION_KEY = "portfolio-admin-session";
const DRAFT_KEY = "portfolio-publications-draft";
const PUBLICATIONS_URL = "/publications.json";
const GITHUB_CONTENTS_API = "https://api.github.com/repos/elmiraliyev123/elmiraliyev123.github.io/contents/publications.json";

const refs = {
  loginPanel: document.getElementById("login-panel"),
  loginForm: document.getElementById("login-form"),
  loginStatus: document.getElementById("login-status"),
  dashboard: document.getElementById("dashboard"),
  publicationForm: document.getElementById("publication-form"),
  publicationId: document.getElementById("publication-id"),
  title: document.getElementById("publication-title"),
  authors: document.getElementById("publication-authors"),
  year: document.getElementById("publication-year"),
  type: document.getElementById("publication-type"),
  venue: document.getElementById("publication-venue"),
  summary: document.getElementById("publication-summary"),
  linkLabel: document.getElementById("publication-link-label"),
  url: document.getElementById("publication-url"),
  editorStatus: document.getElementById("editor-status"),
  publishStatus: document.getElementById("publish-status"),
  adminList: document.getElementById("admin-publications-list"),
  clearFormButton: document.getElementById("clear-form-button"),
  resetButton: document.getElementById("reset-button"),
  publishButton: document.getElementById("publish-button"),
  githubToken: document.getElementById("github-token"),
  logoutButton: document.getElementById("logout-button"),
};

const state = {
  publications: [],
  publishedSnapshot: [],
};

initialize();

async function initialize() {
  bindEvents();

  try {
    const published = await fetchPublishedPublications();
    state.publishedSnapshot = clonePublications(published);
    state.publications = loadDraft() || clonePublications(published);
  } catch (error) {
    state.publications = loadDraft() || [];
    setStatus(refs.publishStatus, "Unable to load the published publications list. Draft mode is still available.", "error");
    console.error(error);
  }

  renderPublicationsList();

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showDashboard();
  } else {
    showLogin();
  }
}

function bindEvents() {
  refs.loginForm.addEventListener("submit", handleLogin);
  refs.publicationForm.addEventListener("submit", handleSavePublication);
  refs.clearFormButton.addEventListener("click", resetForm);
  refs.resetButton.addEventListener("click", resetToPublished);
  refs.publishButton.addEventListener("click", publishToWebsite);
  refs.logoutButton.addEventListener("click", logout);
  refs.adminList.addEventListener("click", handleListAction);
}

async function handleLogin(event) {
  event.preventDefault();

  const username = new FormData(event.currentTarget).get("username");
  const password = new FormData(event.currentTarget).get("password");
  const hash = await sha256(`${username}:${password}`);

  if (hash !== ADMIN_HASH) {
    setStatus(refs.loginStatus, "Incorrect username or password.", "error");
    return;
  }

  sessionStorage.setItem(SESSION_KEY, "1");
  refs.loginForm.reset();
  setStatus(refs.loginStatus, "", "");
  showDashboard();
}

function showLogin() {
  refs.loginPanel.classList.remove("hidden");
  refs.dashboard.classList.add("hidden");
}

function showDashboard() {
  refs.loginPanel.classList.add("hidden");
  refs.dashboard.classList.remove("hidden");
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

function handleSavePublication(event) {
  event.preventDefault();

  const publication = normalizePublication({
    id: refs.publicationId.value || crypto.randomUUID(),
    title: refs.title.value,
    authors: refs.authors.value,
    year: refs.year.value,
    type: refs.type.value,
    venue: refs.venue.value,
    summary: refs.summary.value,
    linkLabel: refs.linkLabel.value,
    url: refs.url.value,
  });

  if (!publication.title) {
    setStatus(refs.editorStatus, "Title is required.", "error");
    return;
  }

  const existingIndex = state.publications.findIndex((entry) => entry.id === publication.id);

  if (existingIndex >= 0) {
    state.publications[existingIndex] = publication;
    setStatus(refs.editorStatus, "Publication updated in local draft.", "success");
  } else {
    state.publications.push(publication);
    setStatus(refs.editorStatus, "Publication added to local draft.", "success");
  }

  state.publications.sort(comparePublications);
  persistDraft();
  renderPublicationsList();
  resetForm();
}

function handleListAction(event) {
  const actionButton = event.target.closest("button[data-action]");

  if (!actionButton) {
    return;
  }

  const publicationId = actionButton.dataset.id;
  const publication = state.publications.find((entry) => entry.id === publicationId);

  if (!publication) {
    return;
  }

  if (actionButton.dataset.action === "edit") {
    populateForm(publication);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (actionButton.dataset.action === "delete") {
    state.publications = state.publications.filter((entry) => entry.id !== publicationId);
    persistDraft();
    renderPublicationsList();
    setStatus(refs.editorStatus, "Publication removed from local draft.", "success");

    if (refs.publicationId.value === publicationId) {
      resetForm();
    }
  }
}

function populateForm(publication) {
  refs.publicationId.value = publication.id;
  refs.title.value = publication.title;
  refs.authors.value = publication.authors;
  refs.year.value = publication.year;
  refs.type.value = publication.type;
  refs.venue.value = publication.venue;
  refs.summary.value = publication.summary;
  refs.linkLabel.value = publication.linkLabel;
  refs.url.value = publication.url;
  setStatus(refs.editorStatus, `Editing \"${publication.title}\".`, "success");
}

function resetForm() {
  refs.publicationForm.reset();
  refs.publicationId.value = "";
}

async function resetToPublished() {
  try {
    const published = await fetchPublishedPublications();
    state.publishedSnapshot = clonePublications(published);
    state.publications = clonePublications(published);
    localStorage.removeItem(DRAFT_KEY);
    renderPublicationsList();
    resetForm();
    setStatus(refs.publishStatus, "Draft reset to the currently published list.", "success");
  } catch (error) {
    setStatus(refs.publishStatus, "Could not reload the published publications list.", "error");
    console.error(error);
  }
}

async function publishToWebsite() {
  const token = refs.githubToken.value.trim();

  if (!token) {
    setStatus(refs.publishStatus, "Enter a GitHub token with contents write access before publishing.", "error");
    return;
  }

  refs.publishButton.disabled = true;
  setStatus(refs.publishStatus, "Publishing changes to GitHub...", "success");

  try {
    const sha = await fetchCurrentFileSha(token);
    const content = `${JSON.stringify(state.publications, null, 2)}\n`;
    const payload = {
      message: `Update publications ${new Date().toISOString()}`,
      content: toBase64(content),
      branch: "main",
    };

    if (sha) {
      payload.sha = sha;
    }

    const response = await fetch(GITHUB_CONTENTS_API, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.message || `GitHub publish failed with ${response.status}`);
    }

    localStorage.removeItem(DRAFT_KEY);
    state.publishedSnapshot = clonePublications(state.publications);
    setStatus(refs.publishStatus, "Publications published. GitHub Pages will update the live site shortly.", "success");
  } catch (error) {
    setStatus(refs.publishStatus, error.message, "error");
    console.error(error);
  } finally {
    refs.publishButton.disabled = false;
  }
}

async function fetchCurrentFileSha(token) {
  const response = await fetch(GITHUB_CONTENTS_API, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.message || `Unable to read publications.json (${response.status})`);
  }

  const data = await response.json();
  return data.sha;
}

async function fetchPublishedPublications() {
  const response = await fetch(`${PUBLICATIONS_URL}?v=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load publications (${response.status})`);
  }

  const publications = await response.json();
  return Array.isArray(publications)
    ? publications.map(normalizePublication).sort(comparePublications)
    : [];
}

function renderPublicationsList() {
  refs.adminList.textContent = "";

  if (state.publications.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "empty-state";

    const title = document.createElement("h3");
    title.textContent = "No publications in the draft yet.";

    const copy = document.createElement("p");
    copy.className = "publication-summary";
    copy.textContent = "Create the first publication with the form above, then publish it to update the live portfolio.";

    emptyState.append(title, copy);
    refs.adminList.append(emptyState);
    return;
  }

  state.publications
    .slice()
    .sort(comparePublications)
    .forEach((publication) => {
      refs.adminList.append(createAdminCard(publication));
    });
}

function createAdminCard(publication) {
  const card = document.createElement("article");
  card.className = "publication-admin-card";

  const title = document.createElement("h3");
  title.textContent = publication.title;

  const meta = document.createElement("p");
  meta.className = "publication-meta";
  meta.textContent = [publication.authors, publication.venue, publication.year].filter(Boolean).join(" | ");

  const summary = document.createElement("p");
  summary.className = "publication-summary";
  summary.textContent = publication.summary || "No summary added yet.";

  const actions = document.createElement("div");
  actions.className = "publication-admin-actions";

  const editButton = createActionButton("Edit", "edit", publication.id);
  const deleteButton = createActionButton("Delete", "delete", publication.id);

  actions.append(editButton, deleteButton);
  card.append(title, meta, summary, actions);

  return card;
}

function createActionButton(label, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = action === "delete" ? "btn btn-secondary" : "btn btn-primary";
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function normalizePublication(publication = {}) {
  return {
    id: String(publication.id || crypto.randomUUID()),
    title: String(publication.title || "").trim(),
    authors: String(publication.authors || "").trim(),
    year: String(publication.year || "").trim(),
    type: String(publication.type || "").trim(),
    venue: String(publication.venue || "").trim(),
    summary: String(publication.summary || "").trim(),
    linkLabel: String(publication.linkLabel || "").trim(),
    url: String(publication.url || "").trim(),
  };
}

function comparePublications(left, right) {
  const leftYear = Number.parseInt(left.year, 10) || 0;
  const rightYear = Number.parseInt(right.year, 10) || 0;

  if (leftYear !== rightYear) {
    return rightYear - leftYear;
  }

  return left.title.localeCompare(right.title);
}

function persistDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state.publications));
}

function loadDraft() {
  const rawDraft = localStorage.getItem(DRAFT_KEY);

  if (!rawDraft) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawDraft);
    return Array.isArray(parsed)
      ? parsed.map(normalizePublication).sort(comparePublications)
      : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function clonePublications(publications) {
  return publications.map((publication) => ({ ...publication }));
}

function setStatus(element, message, tone) {
  element.textContent = message;
  element.className = "status-message";

  if (tone) {
    element.classList.add(tone);
  }
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(value) {
  let binary = "";
  const bytes = new TextEncoder().encode(value);

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}
