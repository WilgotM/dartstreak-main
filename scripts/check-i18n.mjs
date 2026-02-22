import fs from "node:fs";
import path from "node:path";

const localesDir = path.resolve("src/i18n/locales");
const sourceDir = path.resolve("src");
const baselinePath = path.resolve("scripts/i18n-missing-baseline.json");
const shouldUpdateBaseline = process.argv.includes("--update-baseline");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const flattenKeys = (obj, prefix = "") => {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      keys.push(...flattenKeys(value, next));
    } else {
      keys.push(next);
    }
  }

  return keys;
};

const localeFiles = fs.readdirSync(localesDir).filter((file) => file.endsWith(".json")).sort();
const sourceFiles = [];

const getByPath = (obj, dottedPath) => dottedPath.split(".").reduce((acc, key) => {
  if (acc && Object.prototype.hasOwnProperty.call(acc, key)) return acc[key];
  return undefined;
}, obj);

const collectSourceFiles = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath);
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      sourceFiles.push(fullPath);
    }
  }
};

const extractUsedKeys = () => {
  const used = new Set();
  const keyPattern = /\b(?:i18n\.)?t\(\s*["'`]([^"'`]+)["'`]/g;

  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const match of content.matchAll(keyPattern)) {
      const key = match[1]?.trim();
      if (key) used.add(key);
    }
  }

  return [...used].sort();
};

collectSourceFiles(sourceDir);
const usedKeys = extractUsedKeys();

const missingByLocale = {};
for (const localeFile of localeFiles) {
  const localePath = path.join(localesDir, localeFile);
  const localeData = readJson(localePath);
  const missing = usedKeys.filter((key) => {
    const value = getByPath(localeData, key);
    return typeof value !== "string" || value.trim().length === 0;
  });
  missingByLocale[localeFile] = missing;
}

if (shouldUpdateBaseline) {
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify(missingByLocale, null, 2)}\n`,
    "utf8",
  );
  console.log(`Updated baseline: ${path.relative(process.cwd(), baselinePath)}`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing baseline file: ${path.relative(process.cwd(), baselinePath)}`);
  console.error("Run: npm run i18n:baseline");
  process.exit(1);
}

const baseline = readJson(baselinePath);
let hasErrors = false;

for (const localeFile of localeFiles) {
  const currentMissing = new Set(missingByLocale[localeFile] ?? []);
  const allowedMissing = new Set(Array.isArray(baseline[localeFile]) ? baseline[localeFile] : []);
  const unexpectedMissing = [...currentMissing]
    .filter((key) => !allowedMissing.has(key))
    .sort();

  if (unexpectedMissing.length > 0) {
    hasErrors = true;
    console.error(`\n${localeFile} has ${unexpectedMissing.length} new missing key(s):`);
    for (const key of unexpectedMissing) {
      console.error(`  - ${key}`);
    }
  }
}

if (hasErrors) {
  console.error("\ni18n check failed (new missing translations detected).");
  process.exit(1);
}

console.log("i18n check passed (no new missing translations).");
