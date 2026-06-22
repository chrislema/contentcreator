const fs = require('fs');
const path = require('path');

function createCollection(filePath) {
  function load() {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return [];
    }
  }

  function save(records) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
  }

  return {
    list() {
      return load();
    },
    get(id) {
      return load().find((r) => r.id === id) || null;
    },
    add(record) {
      const records = load();
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx >= 0) records[idx] = record;
      else records.push(record);
      save(records);
      return record;
    },
    remove(id) {
      const records = load();
      save(records.filter((r) => r.id !== id));
    },
    clear() {
      save([]);
    },
    setAll(records) {
      save(records);
    }
  };
}

function createDocument(filePath) {
  function load() {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return {};
    }
  }

  function save(doc) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2));
  }

  return {
    get() {
      return load();
    },
    set(doc) {
      save(doc);
      return doc;
    },
    patch(partial) {
      const doc = { ...load(), ...partial };
      save(doc);
      return doc;
    }
  };
}

module.exports = { createCollection, createDocument };
