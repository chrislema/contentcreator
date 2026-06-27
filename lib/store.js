const fs = require('fs');
const path = require('path');

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupInvalidJson(filePath) {
  const backupPath = `${filePath}.invalid-${backupTimestamp()}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function createStoreError(message, cause, backupPath) {
  const error = new Error(message);
  error.name = 'StoreError';
  error.cause = cause;
  if (backupPath) error.backupPath = backupPath;
  return error;
}

function assertCollection(value) {
  if (!Array.isArray(value)) throw new Error('Expected a JSON array');
}

function assertDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object');
  }
}

function readStore(filePath, fallback, validate, label) {
  if (!fs.existsSync(filePath)) return clone(fallback);

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
    const value = JSON.parse(raw);
    validate(value);
    return value;
  } catch (e) {
    if (e.code === 'ENOENT') return clone(fallback);

    let backupPath = null;
    let backupError = null;
    if (raw !== undefined) {
      try {
        backupPath = backupInvalidJson(filePath);
      } catch (err) {
        backupError = err;
      }
    }

    const backupMessage = backupPath
      ? ` Backed up invalid data to ${backupPath}.`
      : backupError ? ` Could not back up invalid data: ${backupError.message}.` : '';
    throw createStoreError(
      `Failed to load ${label} store at ${filePath}: ${e.message}.${backupMessage}`,
      e,
      backupPath
    );
  }
}

function writeStore(filePath, value, validate) {
  validate(value);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    throw e;
  }
}

function createCollection(filePath) {
  let cache = readStore(filePath, [], assertCollection, 'collection');

  function replace(records) {
    const next = clone(records);
    writeStore(filePath, next, assertCollection);
    cache = next;
    return clone(cache);
  }

  return {
    list() {
      return clone(cache);
    },
    get(id) {
      const record = cache.find((r) => r.id === id);
      return record ? clone(record) : null;
    },
    add(record) {
      const records = clone(cache);
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx >= 0) records[idx] = record;
      else records.push(record);
      replace(records);
      return clone(record);
    },
    remove(id) {
      replace(cache.filter((r) => r.id !== id));
    },
    clear() {
      replace([]);
    },
    setAll(records) {
      return replace(records);
    }
  };
}

function createDocument(filePath) {
  let cache = readStore(filePath, {}, assertDocument, 'document');

  function replace(doc) {
    const next = clone(doc);
    writeStore(filePath, next, assertDocument);
    cache = next;
    return clone(cache);
  }

  return {
    get() {
      return clone(cache);
    },
    set(doc) {
      return replace(doc);
    },
    patch(partial) {
      return replace({ ...cache, ...partial });
    }
  };
}

module.exports = { createCollection, createDocument };
