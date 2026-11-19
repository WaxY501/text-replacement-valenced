import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShortcutJson, parseGboardExport, mergeShortcuts, expandAtSend } from '../plugins/text-replacement/js/core.js';

test('JSON list records are parsed', () => {
  assert.deepEqual(parseShortcutJson([{ trigger: 'hi', replacement: 'hello' }]), [{ trigger: 'hi', replacement: 'hello' }]);
});
test('trigger-to-replacement JSON maps are parsed', () => {
  assert.deepEqual(parseShortcutJson({ 'hi': 'hello' }), [{ trigger: 'hi', replacement: 'hello' }]);
});
test('name-to-short-trigger JSON maps are auto-detected', () => {
  assert.deepEqual(parseShortcutJson({ 'Alakazam': 'ala', 'Arbok': 'arb' }), [{ trigger: 'ala', replacement: 'Alakazam' }, { trigger: 'arb', replacement: 'Arbok' }]);
});
test('Gboard tab export ignores comments and preserves mention replacement', () => {
  const source = '# Gboard Dictionary version:2\n# shortcut\tword\tlocale\narb\t<@123456789> c arbok\ten-US\t\n';
  assert.deepEqual(parseGboardExport(source), [{ trigger: 'arb', replacement: '<@123456789> c arbok' }]);
});
test('CSV Gboard-style export parses quoted commas', () => {
  assert.deepEqual(parseGboardExport('"hello, world",hw\n'), [{ trigger: 'hw', replacement: 'hello, world' }]);
});
test('duplicate triggers merge with incoming value', () => {
  assert.deepEqual(mergeShortcuts([{ trigger: 'x', replacement: 'old' }], [{ trigger: 'x', replacement: 'new' }]), [{ trigger: 'x', replacement: 'new' }]);
});
test('send-time expansion preserves punctuation, spaces, and mention strings', () => {
  assert.equal(expandAtSend('say arb! then arb', [{ trigger: 'arb', replacement: '<@123> c Arbok' }]), 'say <@123> c Arbok! then <@123> c Arbok');
  assert.equal(expandAtSend('(arb), [arb] {arb}', [{ trigger: 'arb', replacement: 'expanded' }]), '(expanded), [expanded] {expanded}');
});
