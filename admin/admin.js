import {
  clearDraftPublications,
  comparePublications,
  DRAFT_KEY,
  loadDraftPublications,
  loadPublishedPublications,
  normalizePublication,
  saveDraftPublications,
  savePublishedPublications,
} from "../publications/shared-publications.js";

const ADMIN_HASH = "1b1edbf9315d0bb3e53595eb48b719e513e046f6cc70dec4cc49a16cebd6f621";
const SESSION_KEY = "portfolio-admin-session";

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
  body: document.getElementById("publication-body"),
  linkLabel: document.getElementById("publication-link-label"),
  url: document.getElementById("publication-url"),
  editorStatus: document.getElementById("editor-status"),
  publishStatus: document.getElementById("publish-status"),
  adminList: document.getElementById("admin-publications-list"),
  clearFormButton: document.getElementById("clear-form-button"),
  resetButton: document.getElementById("reset-button"),
  publishButton: document.getElementById("publish-button"),
  logoutButton: document.getElementById("logout-button"),
};

const state = {
  publications: [],
  publishedSnapshot: [],
};

initialize();

async function initialize() {
  bindEvents();

  const published = await loadPublishedPublications();
  state.publishedSnapshot = clonePublications(published);
  state.publications = loadDraftPublications() || clonePublications(published);
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
  refs.publishButton.addEventListener("click", publishArticles);
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
    body: refs.body.value,
    linkLabel: refs.linkLabel.value,
    url: refs.url.value,
  });

  if (!publication.title) {
    setStatus(refs.editorStatus, "Title is required.", "error");
    return;
  }

  if (!publication.body) {
    setStatus(refs.editorStatus, "Full article body is required.", "error");
    return;
  }

  const existingIndex = state.publications.findIndex((entry) => entry.id === publication.id);

  if (existingIndex >= 0) {
    state.publications[existingIndex] = publication;
    setStatus(refs.editorStatus, "Article updated in local draft.", "success");
  } else {
    state.publications.push(publication);
    setStatus(refs.editorStatus, "Article added to local draft.", "success");
  }

  state.publications.sort(comparePublications);
  saveDraftPublications(state.publications);
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
    saveDraftPublications(state.publications);
    renderPublicationsList();
    setStatus(refs.editorStatus, "Article removed from local draft.", "success");

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
  refs.body.value = publication.body;
  refs.linkLabel.value = publication.linkLabel;
  refs.url.value = publication.url;
  setStatus(refs.editorStatus, `Editing \"${publication.title}\".`, "success");
}

function resetForm() {
  refs.publicationForm.reset();
  refs.publicationId.value = "";
}

function resetToPublished() {
  state.publications = clonePublications(state.publishedSnapshot);
  localStorage.removeItem(DRAFT_KEY);
  renderPublicationsList();
  resetForm();
  setStatus(refs.publishStatus, "Draft reset to the currently published article set.", "success");
}

function publishArticles() {
  savePublishedPublications(state.publications);
  clearDraftPublications();
  state.publishedSnapshot = clonePublications(state.publications);
  setStatus(refs.publishStatus, "Articles published. Refresh /publications/ to see the updated article list.", "success");
}

function renderPublicationsList() {
  refs.adminList.textContent = "";

  if (state.publications.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "empty-state";

    const title = document.createElement("h3");
    title.textContent = "No articles in the draft yet.";

    const copy = document.createElement("p");
    copy.className = "publication-summary";
    copy.textContent = "Create the first article with the form above, then publish it to the publications pages.";

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
  summary.textContent = publication.summary || publication.body.slice(0, 180);

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
