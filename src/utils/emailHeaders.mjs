export const SAMPLE_HEADERS = `Received: from relay.example (relay.example [192.0.2.20]) by inbox.example with ESMTPS; Sat, 10 Oct 2026 09:00:12 +0000
Received: from sender.example (sender.example [192.0.2.10]) by relay.example with ESMTPS; Sat, 10 Oct 2026 09:00:02 +0000
Authentication-Results: inbox.example;
 spf=pass smtp.mailfrom=sender.example;
 dkim=pass header.d=sender.example header.s=mail;
 dmarc=pass header.from=sender.example
From: Alex at Example <alex@sender.example>
To: You <you@inbox.example>
Subject: A friendly test message
Date: Sat, 10 Oct 2026 09:00:00 +0000
Message-ID: <demo-123@sender.example>
Return-Path: <alex@sender.example>`;

// Split structured fields without treating semicolons in comments/quotes as delimiters.
function sections(value) {
  const parts = []; let start = 0; let depth = 0; let quoted = false; let escaped = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (!depth && c === '"') quoted = !quoted;
    if (!quoted && c === '(') depth++;
    if (!quoted && c === ')' && depth) depth--;
    if (!quoted && !depth && c === ';') { parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(value.slice(start).trim()); return parts;
}

export function analyzeHeaders(input) {
  if (new TextEncoder().encode(input).length > 200000) throw new Error('Please paste headers smaller than 200 KB.');
  const fields = []; const warnings = [];
  for (const line of input.replace(/\r\n?/g, '\n').trimStart().split('\n')) {
    if (!line.trim()) break; // Ignore the message body.
    if (/^[ \t]/.test(line)) {
      if (fields.length) fields[fields.length - 1].value += ' ' + line.trim();
      else warnings.push('A continuation line had no preceding header.');
      continue;
    }
    const match = /^([!-9;-~]+):[ \t]*(.*)$/.exec(line);
    if (match) fields.push({name: match[1], value: match[2]});
    else warnings.push('An unrecognised header line was skipped.');
  }
  if (!fields.length) throw new Error('No email headers found. Paste the original message headers, including names such as From: and Received:.');
  const values = name => fields.filter(f => f.name.toLowerCase() === name.toLowerCase()).map(f => f.value);
  const summary = ['From', 'To', 'Reply-To', 'Return-Path', 'Subject', 'Date', 'Message-ID'].map(name => ({name, values: values(name)}));
  const authentication = values('Authentication-Results').flatMap(value => {
    const parts = sections(value);
    const source = /^(spf|dkim|dmarc|arc)(?:\/\d+)?\s*=/i.test(parts[0]) ? 'Reporting server not recorded' : parts.shift();
    return parts.flatMap(part => {
      const match = /^(spf|dkim|dmarc|arc)(?:\/\d+)?\s*=\s*([\w-]+)\b(.*)$/i.exec(part);
      return match ? [{source, method: match[1].toUpperCase(), result: match[2].toLowerCase(), details: match[3].trim()}] : [];
    });
  });
  if (!authentication.some(a => a.method === 'SPF')) {
    values('Received-SPF').forEach(value => {
      const match = /^(\w+)\b(.*)/.exec(value);
      if (match) authentication.push({source: 'Received-SPF (receiver not identified)', method: 'SPF', result: match[1].toLowerCase(), details: match[2].trim()});
    });
  }
  const hops = values('Received').reverse().map(raw => {
    const parts = sections(raw); const date = parts.length > 1 ? parts[parts.length - 1] : '';
    // Require an explicit numeric offset; never infer the browser's local timezone.
    const timestamp = /[+-]\d{4}(?:\s*\([^)]*\))?\s*$/.test(date) ? Date.parse(date) : NaN;
    return {raw, from: /\bfrom\s+([^\s;]+)/i.exec(raw)?.[1] || 'Not recorded', by: /\bby\s+([^\s;]+)/i.exec(raw)?.[1] || 'Not recorded', protocol: /\bwith\s+([^\s;]+)/i.exec(raw)?.[1] || 'Not recorded', timestamp: Number.isFinite(timestamp) ? timestamp : null};
  });
  hops.forEach((hop, i) => { hop.delay = i && hop.timestamp !== null && hops[i - 1].timestamp !== null ? (hop.timestamp - hops[i - 1].timestamp) / 1000 : null; });
  if (hops.some(h => h.delay !== null && h.delay < 0)) warnings.push('Some hop times run backwards. Clock differences or altered headers can cause this.');
  return {fields, summary, authentication, hops, warnings: [...new Set(warnings)]};
}

export function reportText(report) {
  return ['Email Header Analysis', ...report.summary.map(f => `${f.name}: ${f.values.join(' | ') || 'Not recorded'}`), '', 'Reported authentication', ...report.authentication.map(a => `${a.method}: ${a.result} — ${a.source} ${a.details}`), '', 'Recorded hops (oldest first)', ...report.hops.map((h, i) => `${i + 1}. ${h.from} → ${h.by}; ${h.timestamp === null ? 'Unknown time' : new Date(h.timestamp).toISOString()}; ${h.delay === null ? 'No comparable previous time' : `${h.delay}s since previous hop`}`), ...report.warnings, '', 'Header claims are not independently verified.'].join('\n');
}
