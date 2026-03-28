const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SOURCE_FILE = path.join(__dirname, "replace-books.js");
const OUTPUT_DIR = path.join(__dirname, "..", "covers");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

function extractBooksArray(sourceCode) {
  const marker = "const books = [";
  const start = sourceCode.indexOf(marker);
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
    if (inSingle || inDouble || inTemplate) continue;
    if (ch === "[") depth += 1;
    if (ch === "]") depth -= 1;
    if (depth === 0) {
      return sourceCode.slice(arrayStart, i + 1);
    }
  }

  throw new Error("Impossible d'extraire les livres");
}

function loadBooks() {
  const raw = fs.readFileSync(SOURCE_FILE, "utf8");
  const books = vm.runInNewContext(extractBooksArray(raw), {});
  return books.map((book) => ({
    id: book.legacy_id || book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn || book.isbn13 || null,
    category: book.category || null,
  }));
}

function wrapTitle(text, maxCharsPerLine = 18, maxLines = 4) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (words.join(" ").length > lines.join(" ").length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.]{3}$/, "")}...`;
  }
  return lines;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function inferTitleTheme(book) {
  const normalized = `${normalizeText(book.title)} ${normalizeText(book.category)}`;
  const author = String(book.author || "");
  const authorSurname = author.split(/\s+/).filter(Boolean).slice(-1)[0] || author;

  const themes = [
    { key: "forest", eyebrow: "FORET ET MEMOIRE", match: ["foret", "brousse", "nature", "ecologie", "biodiversite", "plantes", "agriculture", "gabon"] },
    { key: "cosmos", eyebrow: "IDEES ET UNIVERS", match: ["temps", "science", "chaos", "harmonie", "cosmos", "physique", "quantique", "etoile"] },
    { key: "network", eyebrow: "SYSTEMES ET RESEAUX", match: ["reseau", "data", "cloud", "web", "python", "algorith", "intelligence", "cyber", "logiciel", "telecom"] },
    { key: "power", eyebrow: "POUVOIR ET SOCIETE", match: ["etat", "droit", "constitution", "politique", "nation", "regime", "economie", "developpement"] },
    { key: "journey", eyebrow: "VOYAGE INTERIEUR", match: ["aventure", "enfant", "petit", "lettre", "soleils", "monde", "americanah", "murambi", "voyage"] },
    { key: "legend", eyebrow: "CONTES ET HERITAGES", match: ["conte", "epopee", "kirikou", "reine", "lion", "mvett", "histoire", "arts", "musique"] }
  ];

  const picked = themes.find((theme) => theme.match.some((term) => normalized.includes(term))) || themes[0];
  return {
    key: picked.key,
    eyebrow: picked.eyebrow,
    byline: authorSurname.toUpperCase()
  };
}

function buildThemeArtwork(theme, accent) {
  const artworks = {
    forest: `
      <circle cx="232" cy="122" r="62" fill="rgba(255,255,255,0.08)" />
      <path d="M42 276 C72 214, 108 186, 146 130" stroke="${accent}" stroke-opacity="0.42" stroke-width="4" fill="none" />
      <path d="M82 278 C108 224, 148 182, 198 126" stroke="rgba(255,255,255,0.14)" stroke-width="3" fill="none" />
      <circle cx="94" cy="146" r="20" fill="rgba(255,255,255,0.08)" />
    `,
    cosmos: `
      <circle cx="226" cy="118" r="56" fill="rgba(255,255,255,0.1)" />
      <circle cx="226" cy="118" r="28" fill="rgba(255,255,255,0.06)" />
      <circle cx="92" cy="164" r="4" fill="${accent}" />
      <circle cx="118" cy="136" r="3" fill="rgba(255,255,255,0.9)" />
      <circle cx="148" cy="182" r="2.5" fill="rgba(255,255,255,0.8)" />
      <path d="M56 230 Q144 160 248 204" stroke="rgba(255,255,255,0.16)" stroke-width="2" fill="none" />
    `,
    network: `
      <rect x="42" y="116" width="210" height="148" rx="18" fill="rgba(7,10,18,0.2)" />
      <circle cx="74" cy="146" r="7" fill="${accent}" />
      <circle cx="188" cy="136" r="7" fill="rgba(255,255,255,0.8)" />
      <circle cx="230" cy="206" r="7" fill="rgba(255,255,255,0.8)" />
      <circle cx="120" cy="232" r="7" fill="rgba(255,255,255,0.8)" />
      <path d="M74 146 L188 136 L230 206 L120 232 Z" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none" />
    `,
    power: `
      <rect x="46" y="110" width="198" height="160" rx="8" fill="rgba(255,255,255,0.06)" />
      <rect x="58" y="122" width="20" height="136" fill="${accent}" fill-opacity="0.88" />
      <line x1="92" y1="144" x2="228" y2="144" stroke="rgba(255,255,255,0.18)" />
      <line x1="92" y1="188" x2="228" y2="188" stroke="rgba(255,255,255,0.14)" />
      <line x1="92" y1="232" x2="204" y2="232" stroke="rgba(255,255,255,0.1)" />
    `,
    journey: `
      <path d="M36 256 C78 236, 110 208, 144 194 S214 162, 266 124" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round" />
      <circle cx="92" cy="216" r="10" fill="rgba(255,255,255,0.14)" />
      <circle cx="190" cy="166" r="14" fill="rgba(255,255,255,0.1)" />
      <circle cx="248" cy="132" r="18" fill="rgba(255,255,255,0.12)" />
    `,
    legend: `
      <circle cx="76" cy="120" r="36" fill="rgba(255,255,255,0.12)" />
      <circle cx="232" cy="172" r="52" fill="rgba(255,255,255,0.08)" />
      <path d="M42 274 Q96 230 150 252 T258 236" stroke="${accent}" stroke-width="3" fill="none" />
      <path d="M62 146 Q112 108 160 146" stroke="rgba(255,255,255,0.16)" stroke-width="2" fill="none" />
    `
  };

  return artworks[theme.key] || artworks.forest;
}

function buildUniqueOverlay(book, accent) {
  const hash = hashString(`${book.title}|${book.author}|${book.category}`);
  const x1 = 34 + (hash % 80);
  const y1 = 96 + (hash % 70);
  const x2 = 170 + (hash % 70);
  const y2 = 120 + ((hash >> 3) % 90);
  const r1 = 10 + (hash % 18);
  const r2 = 22 + ((hash >> 4) % 24);
  const barY = 278 + ((hash >> 2) % 28);
  const barW = 90 + ((hash >> 5) % 90);
  return `
    <circle cx="${x1}" cy="${y1}" r="${r1}" fill="rgba(255,255,255,0.08)" />
    <circle cx="${x2}" cy="${y2}" r="${r2}" fill="rgba(255,255,255,0.06)" />
    <path d="M34 ${barY} L${34 + barW} ${barY}" stroke="${accent}" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round" />
  `;
}

function getCoverStyle(category) {
  const literary = new Set(["romans", "histoire", "droit"]);
  const academic = new Set(["sciences", "economie", "san-bms", "san-sso", "san-ema", "san-sin", "bav-s2a", "bav-hse", "bav-sha"]);
  const technical = new Set(["informatique", "gin-pmi", "gin-gel", "gif-rtl", "gif-glo"]);
  const vibrant = new Set(["jeunesse", "arts"]);

  if (literary.has(category)) return "literary";
  if (academic.has(category)) return "academic";
  if (technical.has(category)) return "technical";
  if (vibrant.has(category)) return "vibrant";
  return "literary";
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
  const accent = "#f6e7cb";
  const titleLines = wrapTitle(book.title, 18, 4);
  const author = String(book.author || "");
  const category = String(book.category || "catalogue").toUpperCase();
  const style = getCoverStyle(book.category);
  const theme = inferTitleTheme(book);
  const safe = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

  const titleBlock = titleLines.map((line, index) => `<text x="42" y="${146 + index * 34}" fill="#ffffff" font-size="${index === 0 ? 30 : 28}" font-family="Georgia, serif" font-weight="700">${safe(line)}</text>`).join("");
  const artwork = buildThemeArtwork(theme, accent);
  const uniqueOverlay = buildUniqueOverlay(book, accent);

  const styleMarkup = {
    literary: `
      <rect x="34" y="104" width="232" height="168" rx="14" fill="rgba(12,14,20,0.24)" />
      ${artwork}
      ${titleBlock}
      <rect x="34" y="292" width="160" height="3" rx="2" fill="${accent}" fill-opacity="0.9" />
    `,
    academic: `
      <rect x="34" y="98" width="232" height="182" rx="6" fill="rgba(255,255,255,0.08)" />
      <rect x="34" y="98" width="14" height="182" rx="6" fill="${accent}" fill-opacity="0.85" />
      <line x1="62" y1="132" x2="248" y2="132" stroke="rgba(255,255,255,0.18)" />
      ${artwork}
      ${titleBlock}
      <circle cx="230" cy="316" r="22" fill="rgba(255,255,255,0.1)" />
    `,
    technical: `
      <rect x="34" y="100" width="232" height="176" rx="16" fill="rgba(7,10,18,0.28)" />
      ${artwork}
      <rect x="42" y="110" width="84" height="10" rx="5" fill="${accent}" fill-opacity="0.8" />
      ${titleBlock}
      <rect x="200" y="296" width="54" height="54" rx="10" fill="rgba(255,255,255,0.08)" />
    `,
    vibrant: `
      <rect x="34" y="108" width="232" height="164" rx="26" fill="rgba(12,14,20,0.20)" />
      ${artwork}
      ${titleBlock}
      <path d="M34 286 Q150 244 266 286" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity="0.75" />
    `
  }[style];

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect width="300" height="400" rx="20" fill="url(#bg)" />
      <rect x="14" y="14" width="272" height="372" rx="18" fill="rgba(14,18,24,0.16)" stroke="rgba(255,255,255,0.24)" />
      <rect x="24" y="24" width="252" height="52" rx="10" fill="rgba(8,10,16,0.28)" />
      <text x="36" y="46" fill="${accent}" font-size="10" font-family="Arial, sans-serif" letter-spacing="2">${safe(theme.eyebrow)}</text>
      <text x="36" y="64" fill="#ffffff" font-size="15" font-family="Arial, sans-serif" font-weight="700">${safe(theme.byline)}</text>
      ${uniqueOverlay}
      ${styleMarkup}
      <text x="36" y="324" fill="#f7f4ee" font-size="18" font-family="Arial, sans-serif" font-weight="700">${safe(author.slice(0, 30))}</text>
      <text x="36" y="350" fill="rgba(255,255,255,0.78)" font-size="12" font-family="Arial, sans-serif" letter-spacing="1.4">${safe(category.slice(0, 18))}</text>
      <rect x="212" y="304" width="46" height="46" rx="8" fill="rgba(255,255,255,0.12)" />
      <path d="M223 317h12c5 0 9 4 9 9v18h-12c-5 0-9-4-9-9v-18Zm21 0h-9v27h9c5 0 9-4 9-9v-9c0-5-4-9-9-9Z" fill="#fff7ed" />
      <path d="M0 300 L300 190 L300 400 L0 400 Z" fill="url(#sheen)" />
    </svg>
  `.replace(/\s+/g, " ").trim();
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const books = loadBooks();
  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
    : {};

  let generated = 0;
  for (const book of books) {
    if (!book.id) continue;
    const existingEntry = manifest[book.id];
    if (existingEntry && existingEntry.source !== "generated_local") continue;
    const baseName = String(book.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${baseName}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), buildGeneratedSvg(book));
    manifest[book.id] = {
      file: `covers/${fileName}`,
      source: "generated_local",
      isbn: book.isbn,
      title: book.title,
    };
    generated += 1;
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Couvertures locales generees pour ${generated} livres manquants.`);
  console.log(`Manifeste mis a jour: ${MANIFEST_PATH}`);
}

main();
