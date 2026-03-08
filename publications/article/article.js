import {
  findPublicationBySlug,
  loadPublishedPublications,
  splitBodyIntoParagraphs,
} from "../shared-publications.js";

const articleView = document.getElementById("article-view");
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

initialize();

async function initialize() {
  const publications = await loadPublishedPublications();
  const publication = slug ? findPublicationBySlug(publications, slug) : null;

  if (!publication) {
    renderMissing();
    return;
  }

  renderArticle(publication);
  document.title = `${publication.title} | Elmir Aliyev`;
}

function renderArticle(publication) {
  articleView.textContent = "";

  const topline = document.createElement("div");
  topline.className = "publication-topline";
  topline.append(createChip(publication.type || "Article"));

  if (publication.year) {
    topline.append(createChip(publication.year));
  }

  const title = document.createElement("h1");
  title.className = "article-title";
  title.textContent = publication.title;

  const meta = document.createElement("p");
  meta.className = "article-meta";
  meta.textContent = [publication.authors, publication.venue].filter(Boolean).join(" | ");

  const summary = document.createElement("p");
  summary.className = "publication-summary";
  summary.textContent = publication.summary || "";

  const body = document.createElement("div");
  body.className = "article-body";

  const paragraphs = splitBodyIntoParagraphs(publication.body || publication.summary);
  paragraphs.forEach((paragraph) => {
    const node = document.createElement("p");
    node.textContent = paragraph;
    body.append(node);
  });

  articleView.append(topline, title, meta);

  if (publication.summary) {
    articleView.append(summary);
  }

  if (body.childElementCount) {
    articleView.append(body);
  }

  if (publication.url) {
    const actions = document.createElement("div");
    actions.className = "publication-actions";

    const link = document.createElement("a");
    link.className = "publication-link";
    link.href = publication.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = publication.linkLabel || "Open external source";

    actions.append(link);
    articleView.append(actions);
  }
}

function renderMissing() {
  articleView.textContent = "";

  const title = document.createElement("h1");
  title.className = "article-title";
  title.textContent = "Article not found";

  const copy = document.createElement("p");
  copy.className = "empty-state-note";
  copy.textContent = "This article is not published yet or the link is invalid.";

  articleView.append(title, copy);
}

function createChip(label) {
  const chip = document.createElement("span");
  chip.className = "publication-chip";
  chip.textContent = label;
  return chip;
}
