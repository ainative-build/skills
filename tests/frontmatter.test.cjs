'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { repoRoot } = require('./helpers.cjs');
const { parseFrontmatter, setFrontmatterField } = require(path.join(repoRoot, 'skills/engineering/aif-plan/scripts/lib.cjs'));

const doc = `---
title: "Fork: \\"aif\\" kit"
status: pending  # pending | done
effort: ""
phase: 3
tags: [feature, "a b"]
quoted: 'it''s'
---

# Body
`;

test('parseFrontmatter reads scalars, comments, quotes and inline lists', () => {
  const { data, body } = parseFrontmatter(doc);
  assert.deepEqual(data, { title: 'Fork: "aif" kit', status: 'pending', effort: '', phase: 3, tags: ['feature', 'a b'], quoted: "it's" });
  assert.equal(body, '\n# Body\n');
});

test('parseFrontmatter returns null data without frontmatter', () => {
  assert.equal(parseFrontmatter('# no frontmatter').data, null);
});

test('setFrontmatterField replaces in place, keeps comments, appends new keys', () => {
  let out = setFrontmatterField(doc, 'status', 'completed');
  assert.match(out, /^status: completed  # pending \| done$/m);
  out = setFrontmatterField(out, 'title', 'Plain title');
  assert.match(out, /^title: Plain title$/m);
  out = setFrontmatterField(out, 'reviewer', 'needs: quoting');
  assert.match(out, /^reviewer: "needs: quoting"\n---\n/m);
  assert.equal(parseFrontmatter(out).data.phase, 3);
  assert.ok(out.endsWith('\n# Body\n'));
});
