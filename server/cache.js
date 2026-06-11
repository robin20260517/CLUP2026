const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(key); return null; }
  return entry.data;
}

function set(key, data, ttlSeconds = 300) {
  store.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

function del(key) { store.delete(key); }

function size() { return store.size; }

module.exports = { get, set, del, size };
