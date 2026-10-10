import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeHeaders, reportText, SAMPLE_HEADERS} from '../src/utils/emailHeaders.mjs';

test('orders delivery hops and preserves reported authentication', () => {
  const result = analyzeHeaders(SAMPLE_HEADERS);
  assert.equal(result.authentication.length, 3);
  assert.equal(result.hops[0].from, 'sender.example');
  assert.equal(result.hops[1].delay, 10);
  assert.ok(reportText(result).includes('DKIM: pass'));
});
test('unfolds CRLF headers, retains duplicates and excludes the body', () => {
  const result = analyzeHeaders('Subject: hi\r\n folded\r\nSubject: second\r\n\r\nFrom: body');
  assert.equal(result.fields.length, 2);
  assert.equal(result.fields[0].value, 'hi folded');
});
test('handles Microsoft-style results and semicolons inside comments', () => {
  const result = analyzeHeaders('Authentication-Results: spf=pass (comment; here); dkim=fail\nAuthentication-Results: receiver.example; dmarc=none');
  assert.equal(result.authentication.length, 3);
  assert.equal(result.authentication[0].source, 'Reporting server not recorded');
  assert.equal(result.authentication[2].source, 'receiver.example');
});
test('respects time offsets, flags clock skew and leaves ambiguous dates unknown', () => {
  const result = analyzeHeaders('Received: by last; Sat, 10 Oct 2026 08:00:00 +0000\nReceived: by first; Sat, 10 Oct 2026 10:00:01 +0200');
  assert.equal(result.hops[1].delay, -1);
  assert.equal(result.warnings.length, 1);
  assert.equal(analyzeHeaders('Received: by x; Sat, 10 Oct 2026 09:00:00').hops[0].timestamp, null);
});
test('rejects invalid and oversized inputs', () => {
  assert.throws(() => analyzeHeaders('garbage'));
  assert.throws(() => analyzeHeaders('x'.repeat(200001)));
});
