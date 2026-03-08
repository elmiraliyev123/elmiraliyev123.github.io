export const DRAFT_KEY = "portfolio-publications-draft";
export const PUBLISHED_KEY = "portfolio-publications-published";
const PUBLICATIONS_URL = "/publications.json";

export async function loadPublishedPublications() {
  const localPublished = loadStorageArray(PUBLISHED_KEY);

  if (localPublished) {
    return localPublished;
  }

  try {
    const response = await fetch(`${PUBLICATIONS_URL}?v=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load publications (${response.status})`);
    }

    const publications = await response.json();
    return normalizeList(publications);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function loadDraftPublications() {
  return loadStorageArray(DRAFT_KEY);
}

export function saveDraftPublications(publications) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeList(publications)));
}

export function savePublishedPublications(publications) {
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(normalizeList(publications)));
}

export function clearDraftPublications() {
  localStorage.removeItem(DRAFT_KEY);
}

export function normalizePublication(publication = {}) {
  const title = String(publication.title || "").trim();
  const slug = String(publication.slug || slugify(title)).trim();

  return {
    id: String(publication.id || crypto.randomUUID()),
    slug,
    title,
    authors: String(publication.authors || "").trim(),
    year: String(publication.year || "").trim(),
    type: String(publication.type || "").trim(),
    venue: String(publication.venue || "").trim(),
    summary: String(publication.summary || "").trim(),
    body: String(publication.body || "").trim(),
    linkLabel: String(publication.linkLabel || "").trim(),
    url: String(publication.url || "").trim(),
  };
}

export function normalizeList(publications = []) {
  return Array.isArray(publications)
    ? publications
        .map(normalizePublication)
        .filter((publication) => publication.title)
        .sort(comparePublications)
    : [];
}

export function comparePublications(left, right) {
  const leftYear = Number.parseInt(left.year, 10) || 0;
  const rightYear = Number.parseInt(right.year, 10) || 0;

  if (leftYear !== rightYear) {
    return rightYear - leftYear;
  }

  return left.title.localeCompare(right.title);
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findPublicationBySlug(publications, slug) {
  return normalizeList(publications).find((publication) => publication.slug === slug) || null;
}

export function splitBodyIntoParagraphs(body) {
  return String(body || "")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function loadStorageArray(key) {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeList(parsed);
  } catch (error) {
    console.error(error);
    return null;
  }
}
