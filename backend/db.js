/**
 * Simple file-based JSON database.
 * Each collection is stored as a flat JSON object in backend/data/<name>.json.
 * Uses synchronous writes so data is never lost mid-request.
 */

const fs   = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

/**
 * Load a collection from disk into a Map.
 * Keys are the top-level object keys; values are the stored objects.
 */
function load(name) {
  const file = filePath(name);
  if (!fs.existsSync(file)) return new Map();
  try {
    const raw  = fs.readFileSync(file, "utf8");
    const obj  = JSON.parse(raw);
    return new Map(Object.entries(obj));
  } catch {
    console.warn(`[db] Could not parse ${name}.json — starting fresh`);
    return new Map();
  }
}

/**
 * Persist a Map back to disk.
 */
function save(name, map) {
  const obj  = Object.fromEntries(map);
  const file = filePath(name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}

/**
 * Returns a live proxy object for a named collection.
 * The underlying Map is loaded once and kept in memory.
 * Call .save() to flush to disk (or use the auto-save helpers below).
 */
function collection(name) {
  const map = load(name);
  return {
    has:    (key)        => map.has(key),
    get:    (key)        => map.get(key),
    set:    (key, value) => { map.set(key, value);    save(name, map); },
    delete: (key)        => { map.delete(key);        save(name, map); },
    values: ()           => map.values(),
    entries:()           => map.entries(),
    size:   ()           => map.size,
    toMap:  ()           => map,
  };
}

module.exports = { collection };
