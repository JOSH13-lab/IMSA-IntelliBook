require("dotenv").config();

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SOURCE_FILE = path.join(__dirname, "replace-books.js");
const OUTPUT_DIR = path.join(__dirname, "..", "covers");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const REQUEST_TIMEOUT_MS = 15000;
const DELAY_MS = 250;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-zA-Z0-9\s:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBooksArray(sourceCode) {
  const marker = "const books = [";
  const start = sourceCode.indexOf(marker);
  if (start === -1) {
    throw new Error("Impossible de trouver `const books = [` dans replace-books.js");
  }

  const arrayStart = sourceCode.indexOf("[", start);
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (let i = arrayStart; i < sourceCode.length; i++) {
    const ch = sourceCode[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (!inDouble && !inTemplate && ch === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && ch === "`") {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      continue;
    }

    if (ch === "[") depth += 1;
    if (ch === "]") depth -= 1;

    if (depth === 0) {
      return sourceCode.slice(arrayStart, i + 1);
    }
  }

  throw new Error("Impossible d'extraire le tableau des livres");
}

function loadBooks() {
  const raw = fs.readFileSync(SOURCE_FILE, "utf8");
  const arrayLiteral = extractBooksArray(raw);
  const books = vm.runInNewContext(arrayLiteral, {}, { timeout: 1000 });

  if (!Array.isArray(books)) {
    throw new Error("Le tableau des livres extrait est invalide");
  }

  return books.map((book) => ({
    id: book.legacy_id || book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn || book.isbn13 || null,
    category: book.category || null,
  }));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "IMSA-IntelliBook-Covers/1.0",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildCandidates(book) {
  const candidates = [];
  const fullQuery = [book.title, book.author].filter(Boolean).join(" ").trim();
  const titleOnlyQuery = String(book.title || "").trim();
  const normalizedTitle = normalizeText(book.title);
  const normalizedAuthor = normalizeText(book.author);
  const authorSurname = normalizedAuthor ? normalizedAuthor.split(" ").slice(-1)[0] : "";
  const intitleAuthorQuery = [
    titleOnlyQuery ? `intitle:${titleOnlyQuery}` : "",
    book.author ? `inauthor:${book.author}` : "",
  ].filter(Boolean).join(" ");
  const normalizedAdvancedQuery = [
    normalizedTitle ? `intitle:${normalizedTitle}` : "",
    authorSurname ? `inauthor:${authorSurname}` : "",
  ].filter(Boolean).join(" ");

  const pushUnique = (entry) => {
    if (!candidates.some((candidate) => candidate.url === entry.url)) {
      candidates.push(entry);
    }
  };

  if (book.isbn) {
    pushUnique({
      source: "open_library",
      url: `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(book.isbn)}-L.jpg?default=false`,
    });
    pushUnique({
      source: "open_library_isbn_search",
      url: `https://openlibrary.org/search.json?isbn=${encodeURIComponent(book.isbn)}&limit=5`,
      json: true,
      parser: "openlibrary",
    });
    pushUnique({
      source: "google_books_isbn",
      url: `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(book.isbn)}&maxResults=1&fields=items(volumeInfo(imageLinks))`,
      json: true,
    });
  }

  if (fullQuery) {
    pushUnique({
      source: "google_books_text",
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(fullQuery)}&maxResults=5&fields=items(volumeInfo(title,authors,imageLinks))`,
      json: true,
    });
  }

  if (intitleAuthorQuery) {
    pushUnique({
      source: "google_books_advanced",
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(intitleAuthorQuery)}&maxResults=5&fields=items(volumeInfo(title,authors,imageLinks))`,
      json: true,
    });
  }

  if (titleOnlyQuery) {
    pushUnique({
      source: "open_library_search",
      url: `https://openlibrary.org/search.json?title=${encodeURIComponent(titleOnlyQuery)}${book.author ? `&author=${encodeURIComponent(book.author)}` : ""}&limit=5`,
      json: true,
      parser: "openlibrary",
    });
    pushUnique({
      source: "google_books_title_only",
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(titleOnlyQuery)}&maxResults=10&fields=items(volumeInfo(title,authors,imageLinks))`,
      json: true,
    });
  }

  if (normalizedTitle && normalizedTitle !== titleOnlyQuery) {
    pushUnique({
      source: "open_library_search_normalized",
      url: `https://openlibrary.org/search.json?title=${encodeURIComponent(normalizedTitle)}${normalizedAuthor ? `&author=${encodeURIComponent(normalizedAuthor)}` : ""}&limit=10`,
      json: true,
      parser: "openlibrary",
    });
    pushUnique({
      source: "google_books_normalized",
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent([normalizedTitle, normalizedAuthor].filter(Boolean).join(" "))}&maxResults=10&fields=items(volumeInfo(title,authors,imageLinks))`,
      json: true,
    });
  }

  if (normalizedAdvancedQuery) {
    pushUnique({
      source: "google_books_surname",
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(normalizedAdvancedQuery)}&maxResults=10&fields=items(volumeInfo(title,authors,imageLinks))`,
      json: true,
    });
  }

  if (normalizedTitle) {
    pushUnique({
      source: "open_library_q_search",
      url: `https://openlibrary.org/search.json?q=${encodeURIComponent([normalizedTitle, normalizedAuthor].filter(Boolean).join(" "))}&limit=10`,
      json: true,
      parser: "openlibrary",
    });
  }

  return candidates;
}

function pickGoogleImage(data) {
  const items = data?.items;
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    const imageLinks = item?.volumeInfo?.imageLinks;
    const imageUrl =
      imageLinks?.extraLarge ||
      imageLinks?.large ||
      imageLinks?.medium ||
      imageLinks?.thumbnail ||
      imageLinks?.smallThumbnail;

    if (imageUrl) {
      return imageUrl.replace("http://", "https://");
    }
  }

  return null;
}

function pickOpenLibraryImage(data) {
  const docs = data?.docs;
  if (!Array.isArray(docs)) return null;

  for (const doc of docs) {
    if (doc?.cover_i) {
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
  }

  return null;
}

function getExtensionFromResponse(response, fallback = ".jpg") {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  return fallback;
}

function buildGeneratedSvg(book) {
  const paletteByCategory = {
    romans: ["#8c3d1f", "#d97706"],
    histoire: ["#1d4ed8", "#0f766e"],
    sciences: ["#0f766e", "#22c55e"],
    informatique: ["#0f172a", "#2563eb"],
    droit: ["#7c2d12", "#b45309"],
    jeunesse: ["#be185d", "#f97316"],
    arts: ["#7c3aed", "#ec4899"],
    economie: ["#14532d", "#65a30d"],
    "san-bms": ["#115e59", "#14b8a6"],
    "san-sso": ["#1d4ed8", "#38bdf8"],
    "san-ema": ["#9d174d", "#fb7185"],
    "san-sin": ["#166534", "#4ade80"],
    "bav-s2a": ["#365314", "#84cc16"],
    "bav-hse": ["#334155", "#f59e0b"],
    "bav-sha": ["#155e75", "#06b6d4"],
    "gin-pmi": ["#3f3f46", "#f97316"],
    "gin-gel": ["#172554", "#3b82f6"],
    "gif-rtl": ["#111827", "#0ea5e9"],
    "gif-glo": ["#1e1b4b", "#8b5cf6"],
  };

  const [start, end] = paletteByCategory[book.category] || ["#113c6b", "#f28c28"];
  const safe = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="300" height="400" rx="20" fill="url(#bg)" />
      <rect x="18" y="18" width="264" height="364" rx="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <text x="28" y="54" fill="#f8fafc" font-size="16" font-family="Arial, sans-serif" font-weight="700">${safe(book.category || "IMSA")}</text>
      <text x="28" y="118" fill="#ffffff" font-size="28" font-family="Georgia, serif" font-weight="700">${safe(String(book.title || "").slice(0, 24))}</text>
      <text x="28" y="152" fill="#ffffff" font-size="28" font-family="Georgia, serif" font-weight="700">${safe(String(book.title || "").slice(24, 48))}</text>
      <text x="28" y="320" fill="rgba(255,255,255,0.92)" font-size="18" font-family="Arial, sans-serif">${safe(String(book.author || "").slice(0, 28))}</text>
      <text x="28" y="350" fill="rgba(255,255,255,0.75)" font-size="15" font-family="Arial, sans-serif">IMSA IntelliBook</text>
    </svg>
  `.replace(/\s+/g, " ").trim();
}

async function downloadBinary(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1500) {
    return null;
  }

  return {
    buffer,
    extension: getExtensionFromResponse(response),
  };
}

async function downloadCover(book) {
  const candidates = buildCandidates(book);

  for (const candidate of candidates) {
    try {
      if (candidate.json) {
        const response = await fetchWithTimeout(candidate.url);
        if (!response.ok) continue;
        const data = await response.json();
        const imageUrl = candidate.parser === "openlibrary"
          ? pickOpenLibraryImage(data)
          : pickGoogleImage(data);
        if (!imageUrl) continue;
        const binary = await downloadBinary(imageUrl);
        if (!binary) continue;
        return { ...binary, source: candidate.source };
      }

      const binary = await downloadBinary(candidate.url);
      if (binary) {
        return { ...binary, source: candidate.source };
      }
    } catch (error) {
      // Continuer vers la source suivante.
    }
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : null;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const books = loadBooks().filter((book) => book.id && book.title);
  const selectedBooks = Number.isFinite(limit) && limit > 0 ? books.slice(0, limit) : books;
  const manifest = {};

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Preparation de ${selectedBooks.length} livres pour le lot local de couvertures...`);

  for (const book of selectedBooks) {
    const baseName = String(book.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const existing = fs.readdirSync(OUTPUT_DIR).find((file) => file.startsWith(`${baseName}.`));
    if (existing) {
      manifest[book.id] = {
        file: `covers/${existing}`,
        source: "existing",
        isbn: book.isbn,
        title: book.title,
      };
      skipped += 1;
      continue;
    }

    process.stdout.write(`- ${book.id} | ${book.title.substring(0, 50)} ... `);
    const result = await downloadCover(book);

    if (!result) {
      const fileName = `${baseName}.svg`;
      fs.writeFileSync(path.join(OUTPUT_DIR, fileName), buildGeneratedSvg(book));
      manifest[book.id] = {
        file: `covers/${fileName}`,
        source: "generated_local",
        isbn: book.isbn,
        title: book.title,
      };
      console.log("genere localement");
      failed += 1;
      await sleep(DELAY_MS);
      continue;
    }

    const fileName = `${baseName}${result.extension}`;
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), result.buffer);
    manifest[book.id] = {
      file: `covers/${fileName}`,
      source: result.source,
      isbn: book.isbn,
      title: book.title,
    };
    downloaded += 1;
    console.log(`ok (${result.source})`);
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log("");
  console.log(`Telechargees : ${downloaded}`);
  console.log(`Deja presentes : ${skipped}`);
  console.log(`Introuvables : ${failed}`);
  console.log(`Manifeste : ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error("Erreur fatale:", error.message);
  process.exit(1);
});
