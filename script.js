const publicationsList = document.getElementById("publications-list");

document.getElementById("year").textContent = new Date().getFullYear();

if (publicationsList) {
  loadPublications();
}

async function loadPublications() {
  try {
    const response = await fetch(`publications.json?v=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load publications (${response.status})`);
    }

    const publications = await response.json();
    renderPublications(Array.isArray(publications) ? publications : []);
  } catch (error) {
    renderPublications([]);
    console.error(error);
  }
}

function renderPublications(publications) {
  publicationsList.textContent = "";

  const normalized = publications
    .map(normalizePublication)
    .filter((publication) => publication.title)
    .sort(comparePublications);

  if (normalized.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "publication-empty";

    const title = document.createElement("h3");
    title.textContent = "Publications will appear here.";

    const body = document.createElement("p");
    body.className = "publication-summary";
    body.textContent =
      "This section is ready for papers, technical reports, and research writeups as they are published.";

    emptyState.append(title, body);
    publicationsList.append(emptyState);
    return;
  }

  normalized.forEach((publication) => {
    publicationsList.append(createPublicationCard(publication));
  });
}

function createPublicationCard(publication) {
  const card = document.createElement("article");
  card.className = "publication-card";

  const topline = document.createElement("div");
  topline.className = "publication-topline";

  topline.append(createChip(publication.type || "Publication"));

  if (publication.year) {
    topline.append(createChip(String(publication.year)));
  }

  const title = document.createElement("h3");
  title.textContent = publication.title;

  const authors = document.createElement("p");
  authors.className = "publication-authors";
  authors.textContent = publication.authors || "Elmir Aliyev";

  const venue = document.createElement("p");
  venue.className = "publication-venue";
  venue.textContent = publication.venue || "Publication details coming soon.";

  const summary = document.createElement("p");
  summary.className = "publication-summary";
  summary.textContent =
    publication.summary ||
    "A concise overview of the publication will be added here.";

  card.append(topline, title, authors, venue, summary);

  if (publication.url) {
    const actions = document.createElement("div");
    actions.className = "publication-actions";

    const link = document.createElement("a");
    link.className = "publication-link";
    link.href = publication.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = publication.linkLabel || "Open publication";

    actions.append(link);
    card.append(actions);
  }

  return card;
}

function createChip(label) {
  const chip = document.createElement("span");
  chip.className = "publication-chip";
  chip.textContent = label;
  return chip;
}

function normalizePublication(publication = {}) {
  return {
    id: publication.id || crypto.randomUUID(),
    title: String(publication.title || "").trim(),
    authors: String(publication.authors || "").trim(),
    venue: String(publication.venue || "").trim(),
    year: String(publication.year || "").trim(),
    type: String(publication.type || "").trim(),
    summary: String(publication.summary || "").trim(),
    url: String(publication.url || "").trim(),
    linkLabel: String(publication.linkLabel || "").trim(),
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
