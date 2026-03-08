import { loadPublishedPublications } from "./shared-publications.js";

const publicationsList = document.getElementById("publications-list");

initialize();

async function initialize() {
  const publications = await loadPublishedPublications();
  renderList(publications);
}

function renderList(publications) {
  publicationsList.textContent = "";

  if (publications.length === 0) {
    const emptyState = document.createElement("article");
    emptyState.className = "publication-empty";

    const title = document.createElement("h3");
    title.textContent = "No published articles yet.";

    const body = document.createElement("p");
    body.className = "publication-summary";
    body.textContent = "Use the hidden /admin page to publish the first full article.";

    emptyState.append(title, body);
    publicationsList.append(emptyState);
    return;
  }

  publications.forEach((publication) => {
    publicationsList.append(createCard(publication));
  });
}

function createCard(publication) {
  const card = document.createElement("article");
  card.className = "publication-card";

  const topline = document.createElement("div");
  topline.className = "publication-topline";
  topline.append(createChip(publication.type || "Article"));

  if (publication.year) {
    topline.append(createChip(publication.year));
  }

  const title = document.createElement("h2");
  title.textContent = publication.title;

  const authors = document.createElement("p");
  authors.className = "publication-authors";
  authors.textContent = publication.authors || "Elmir Aliyev";

  const venue = document.createElement("p");
  venue.className = "publication-venue";
  venue.textContent = publication.venue || "Independent publication";

  const summary = document.createElement("p");
  summary.className = "publication-summary";
  summary.textContent = publication.summary || "No summary added yet.";

  const actions = document.createElement("div");
  actions.className = "publication-actions";

  const readLink = document.createElement("a");
  readLink.className = "publication-link";
  readLink.href = `/publications/article/?slug=${encodeURIComponent(publication.slug)}`;
  readLink.textContent = "Read article";

  actions.append(readLink);

  if (publication.url) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "secondary-link";
    sourceLink.href = publication.url;
    sourceLink.target = "_blank";
    sourceLink.rel = "noreferrer";
    sourceLink.textContent = publication.linkLabel || "Open source";
    actions.append(sourceLink);
  }

  card.append(topline, title, authors, venue, summary, actions);
  return card;
}

function createChip(label) {
  const chip = document.createElement("span");
  chip.className = "publication-chip";
  chip.textContent = label;
  return chip;
}
