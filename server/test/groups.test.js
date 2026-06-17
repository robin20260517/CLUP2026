const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDCMatrix } = require('../engine/matrix');

test('buildDCMatrix is exported and returns a normalized grid', () => {
  const { probs, total } = buildDCMatrix(1.4, 1.0, 4);
  assert.equal(probs.length, 25); // (4+1) x (4+1)
  assert.ok(total > 0);
  const sum = probs.reduce((s, p) => s + p.p, 0);
  assert.ok(Math.abs(sum - total) < 1e-9);
});
