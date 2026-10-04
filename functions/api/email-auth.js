// Cloudflare Pages Function: GET /api/email-auth?domain=example.com&selectors=a,b&scan=1
//
// Checks SPF (with a full recursive DNS-lookup count against the limit of 10),
// DKIM (selectors you supply, plus an optional scan of common selectors) and DMARC.
// Uses public DNS only (Cloudflare DNS-over-HTTPS). Nothing is stored; results are
// cached for 15 minutes at the edge.
//
// Cloudflare's free plan allows 50 subrequests per call, so each check gets its own
// query budget (SPF 20 + DMARC 6 + DKIM 22 = 48).

const DOH_URL = 'https://cloudflare-dns.com/dns-query';
const CACHE_SECONDS = 900;
const TIMEOUT_MS = 7000;
const SPF_LOOKUP_LIMIT = 10;

const BUDGET = { spf: 20, dmarc: 6, dkim: 22 };

const COMMON_SELECTORS = [
  'selector1', 'selector2', 'default', 'google', 'k1', 'k2', 'k3', 's1', 's2', 'mail',
  'dkim', 'smtp', 'mandrill', 'everlytickey1', 'cm', 'protonmail', 'protonmail2', 'protonmail3',
  'zendesk1', 'zendesk2', 'mxvault', 'sig1',
];

const KNOWN_SENDERS = [
  [/(^|\.)spf\.protection\.outlook\.com$/, 'Microsoft 365 (Exchange Online)'],
  [/(^|\.)_spf\.google\.com$/, 'Google Workspace'],
  [/(^|\.)sendgrid\.net$/, 'Twilio SendGrid'],
  [/(^|\.)mailgun\.org$/, 'Mailgun'],
  [/(^|\.)amazonses\.com$/, 'Amazon SES'],
  [/(^|\.)servers\.mcsv\.net$/, 'Mailchimp'],
  [/(^|\.)spf\.mandrillapp\.com$/, 'Mandrill'],
  [/(^|\.)_spf\.salesforce\.com$/, 'Salesforce'],
  [/(^|\.)mimecast\.com$/, 'Mimecast'],
  [/(^|\.)pphosted\.com$/, 'Proofpoint'],
  [/(^|\.)spf\.messagelabs\.com$/, 'Symantec Email Security'],
  [/(^|\.)zoho\.(com|eu|in|com\.au)$/, 'Zoho Mail'],
];

// ---------- helpers ----------

function timeoutSignal(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

function normalizeDomain(input) {
  let d = String(input || '').trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^.*@/, '').split('/')[0].split('?')[0].replace(/\.$/, '');
  if (d.length < 4 || d.length > 253) return null;
  if (!/^([a-z0-9-]{1,63}\.)+[a-z0-9-]{2,63}$/.test(d)) return null;
  if (d.split('.').some((label) => label.startsWith('-') || label.endsWith('-'))) return null;
  if (/^[0-9.]+$/.test(d)) return null;
  if (/\.(local|internal|localhost|lan|home|corp)$/.test(d)) return null;
  return d;
}

function txtValue(data) {
  const parts = [...String(data).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  return parts.length ? parts.join('') : String(data);
}

// A resolver with its own query budget
function makeResolver(maxQueries) {
  let used = 0;
  return {
    get used() {
      return used;
    },
    async txt(name) {
      if (used >= maxQueries) return { records: [], ok: false, nx: false, exhausted: true };
      used += 1;
      const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=TXT`;
      try {
        const res = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: timeoutSignal(TIMEOUT_MS) });
        if (!res.ok) return { records: [], ok: false, nx: false, exhausted: false };
        const body = await res.json();
        const records = (body.Answer || []).filter((a) => a.type === 16).map((a) => txtValue(a.data));
        return { records, ok: true, nx: body.Status === 3, exhausted: false };
      } catch (e) {
        return { records: [], ok: false, nx: false, exhausted: false };
      }
    },
  };
}

const RANK = { pass: 0, info: 0, warn: 1, fail: 2 };
function worst(issues, fallback = 'pass') {
  let s = fallback;
  for (const i of issues) if (RANK[i.status] > RANK[s]) s = i.status;
  return s;
}

const isSpf = (r) => /^v=spf1(\s|$)/i.test(r.trim());

// ---------- SPF ----------

function parseSpfTerms(record) {
  const parts = record.trim().split(/\s+/).slice(1);
  return parts.map((raw) => {
    const mod = raw.match(/^(redirect|exp)=(.+)$/i);
    if (mod) return { kind: 'modifier', name: mod[1].toLowerCase(), value: mod[2], raw };
    const m = raw.match(/^([+\-~?])?(all|include|a|mx|ptr|ip4|ip6|exists)(?:([:/])(.*))?$/i);
    if (!m) return { kind: 'unknown', raw };
    const sep = m[3];
    const value = sep === ':' ? m[4] : sep === '/' ? `/${m[4]}` : null;
    return { kind: 'mech', qualifier: m[1] || '+', mech: m[2].toLowerCase(), value, raw };
  });
}

function targetDomain(value, fallback) {
  if (!value) return fallback;
  const v = value.replace(/\/\d+(\/\d+)?$/, '');
  return v && !v.startsWith('/') ? v.toLowerCase() : fallback;
}

async function walkSpf(domain, depth, via, ctx, resolver) {
  const node = { domain, depth, via, record: null, lookups: 0, error: null, notes: [] };
  ctx.tree.push(node);

  if (ctx.stack.includes(domain)) {
    node.error = 'Loop detected: this domain is already being evaluated higher up.';
    ctx.errors.push(`SPF include loop involving ${domain}.`);
    return node;
  }
  ctx.stack.push(domain);

  const res = await resolver.txt(domain);
  if (res.exhausted) {
    ctx.truncated = true;
    node.error = 'Not resolved: query budget reached.';
    ctx.stack.pop();
    return node;
  }
  if (!res.ok) {
    node.error = 'DNS lookup failed or timed out.';
    ctx.errors.push(`Could not read the TXT records for ${domain}.`);
    ctx.stack.pop();
    return node;
  }

  const spfs = res.records.filter(isSpf);
  if (spfs.length === 0) {
    node.error = 'No SPF record found at this name.';
    if (depth > 0) ctx.errors.push(`${domain} has no SPF record, which makes the include fail with a permanent error.`);
    ctx.stack.pop();
    return node;
  }
  if (spfs.length > 1) {
    node.error = 'Multiple SPF records found. Only one is allowed.';
    ctx.errors.push(`${domain} publishes ${spfs.length} SPF records; receivers return a permanent error.`);
  }

  node.record = spfs[0];
  const terms = parseSpfTerms(node.record);
  let allTerm = null;
  let redirect = null;

  for (const t of terms) {
    if (t.kind === 'unknown') {
      node.notes.push(`Unrecognized term "${t.raw}".`);
      ctx.warnings.push(`${domain}: unrecognized SPF term "${t.raw}".`);
      continue;
    }
    if (t.kind === 'modifier') {
      if (t.name === 'redirect') redirect = t;
      continue;
    }
    if (t.mech === 'all') {
      allTerm = t.qualifier + 'all';
      continue;
    }
    if (t.mech === 'ip4' || t.mech === 'ip6') {
      ctx.ranges += 1;
      continue;
    }
    // Mechanisms that cost a DNS lookup
    node.lookups += 1;
    ctx.lookups += 1;
    if (t.mech === 'ptr') ctx.ptr = true;
    if (t.mech === 'include') {
      const target = targetDomain(t.value, null);
      if (!target) {
        node.notes.push('include without a domain.');
        continue;
      }
      if (target.includes('%')) {
        node.notes.push(`include:${target} uses macros and was not expanded.`);
        continue;
      }
      ctx.includes.push(target);
      await walkSpf(target, depth + 1, `include:${target}`, ctx, resolver);
    }
  }

  if (redirect) {
    node.lookups += 1;
    ctx.lookups += 1;
    if (allTerm) {
      node.notes.push('redirect= is ignored because an "all" mechanism is present.');
    } else if (!redirect.value.includes('%')) {
      const child = await walkSpf(redirect.value.toLowerCase(), depth + 1, `redirect=${redirect.value}`, ctx, resolver);
      allTerm = child.all || null;
    }
  }

  node.all = allTerm;
  ctx.stack.pop();
  return node;
}

async function checkSpf(domain) {
  const resolver = makeResolver(BUDGET.spf);
  const ctx = {
    lookups: 0, ranges: 0, ptr: false, truncated: false,
    tree: [], stack: [], errors: [], warnings: [], includes: [],
  };
  const root = await walkSpf(domain, 0, 'root', ctx, resolver);
  const issues = [];

  if (!root.record) {
    issues.push({
      status: 'fail',
      message: root.error && !/budget/.test(root.error)
        ? 'No SPF record found. Receivers cannot verify which servers may send mail for this domain.'
        : 'Could not read the SPF record.',
    });
    return { status: 'fail', record: null, lookups: 0, limit: SPF_LOOKUP_LIMIT, all: null, tree: ctx.tree, issues, senders: [], truncated: false };
  }

  ctx.errors.forEach((m) => issues.push({ status: 'fail', message: m }));
  ctx.warnings.forEach((m) => issues.push({ status: 'warn', message: m }));

  if (ctx.lookups > SPF_LOOKUP_LIMIT) {
    issues.push({
      status: 'fail',
      message: `${ctx.lookups} DNS lookups required, over the limit of ${SPF_LOOKUP_LIMIT}. Receivers return a permanent error and SPF fails. Remove unused includes or flatten the record.`,
    });
  } else if (ctx.lookups >= 9) {
    issues.push({ status: 'warn', message: `${ctx.lookups} of ${SPF_LOOKUP_LIMIT} DNS lookups used. Adding one more sender could break SPF.` });
  } else {
    issues.push({ status: 'pass', message: `${ctx.lookups} of ${SPF_LOOKUP_LIMIT} DNS lookups used.` });
  }

  const all = root.all;
  if (!all) issues.push({ status: 'warn', message: 'No "all" mechanism, so mail from unlisted servers is not restricted.' });
  else if (all === '-all') issues.push({ status: 'pass', message: 'Ends with -all (hard fail): unlisted servers are rejected.' });
  else if (all === '~all') issues.push({ status: 'warn', message: 'Ends with ~all (soft fail). Common and acceptable alongside an enforcing DMARC policy; move to -all once every legitimate sender is listed.' });
  else if (all === '?all') issues.push({ status: 'warn', message: 'Ends with ?all (neutral), which gives no protection.' });
  else issues.push({ status: 'fail', message: 'Ends with +all, which authorizes every server on the internet to send as this domain.' });

  if (ctx.ptr) issues.push({ status: 'warn', message: 'Uses the ptr mechanism, which is slow and discouraged by the SPF standard.' });
  if (root.record.length > 450) {
    issues.push({ status: 'warn', message: `The root record is ${root.record.length} characters. Very long records risk exceeding DNS response size limits.` });
  }
  if (ctx.truncated) {
    issues.push({ status: 'info', message: 'The include tree is deeper than this tool can follow in one run, so the lookup count may be higher than shown.' });
  }
  issues.push({
    status: 'info',
    message: 'Void lookups (includes that return nothing) and the targets of a, mx and exists terms are counted but not resolved here.',
  });

  const senders = [...new Set(
    ctx.includes
      .map((inc) => {
        const hit = KNOWN_SENDERS.find(([re]) => re.test(inc));
        return hit ? hit[1] : null;
      })
      .filter(Boolean),
  )];
  if (senders.length) issues.push({ status: 'info', message: `Recognized senders: ${senders.join(', ')}.` });

  return {
    status: worst(issues),
    record: root.record,
    lookups: ctx.lookups,
    limit: SPF_LOOKUP_LIMIT,
    all: all || null,
    ipRanges: ctx.ranges,
    tree: ctx.tree,
    issues,
    senders,
    truncated: ctx.truncated,
  };
}

// ---------- DMARC ----------

function parseTags(record) {
  const tags = {};
  record.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) tags[k.trim().toLowerCase()] = v.join('=').trim();
  });
  return tags;
}

async function checkDmarc(domain) {
  const resolver = makeResolver(BUDGET.dmarc);
  const labels = domain.split('.');
  let found = null;
  let foundAt = null;

  for (let i = 0; i <= labels.length - 2 && i < 4; i += 1) {
    const name = labels.slice(i).join('.');
    const r = await resolver.txt(`_dmarc.${name}`);
    const recs = r.records.filter((x) => /^v=DMARC1\b/i.test(x.trim()));
    if (recs.length) {
      found = recs;
      foundAt = name;
      break;
    }
    if (r.exhausted) break;
  }

  if (!found) {
    return {
      status: 'fail', record: null, foundAt: null, tags: {},
      issues: [{ status: 'fail', message: 'No DMARC record found. Spoofed mail is not blocked and no reports are received.' }],
    };
  }

  const issues = [];
  if (found.length > 1) issues.push({ status: 'fail', message: 'Multiple DMARC records found. Receivers ignore DMARC when more than one exists.' });
  const record = found[0];
  const tags = parseTags(record);
  const policy = (tags.p || '').toLowerCase();
  const pct = tags.pct ? parseInt(tags.pct, 10) : 100;

  if (foundAt !== domain) {
    issues.push({ status: 'info', message: `No record at _dmarc.${domain}. Using the policy inherited from _dmarc.${foundAt}.` });
  }

  if (policy === 'reject') issues.push({ status: 'pass', message: 'Policy p=reject: failing mail is rejected.' });
  else if (policy === 'quarantine') issues.push({ status: 'pass', message: 'Policy p=quarantine: failing mail goes to junk. Consider p=reject once reports are clean.' });
  else if (policy === 'none') issues.push({ status: 'warn', message: 'Policy p=none is monitoring only and does not block spoofed mail. Move to quarantine, then reject.' });
  else issues.push({ status: 'fail', message: 'Missing or invalid p= tag. A DMARC record must declare a policy.' });

  if (pct < 100) issues.push({ status: 'warn', message: `pct=${pct}: only ${pct}% of failing mail is subject to the policy.` });
  if (tags.sp && tags.sp.toLowerCase() === 'none' && policy !== 'none') {
    issues.push({ status: 'warn', message: 'Subdomain policy sp=none leaves subdomains unprotected.' });
  }

  if (!tags.rua) {
    issues.push({ status: 'warn', message: 'No aggregate report address (rua). You will not receive reports showing who sends as your domain.' });
  } else {
    const targets = [...tags.rua.matchAll(/mailto:([^,;\s]+)/gi)].map((m) => m[1]);
    const external = [...new Set(
      targets
        .map((t) => (t.split('@')[1] || '').toLowerCase().replace(/!.*$/, ''))
        .filter((d) => d && d !== foundAt && !d.endsWith(`.${foundAt}`)),
    )].slice(0, 3);
    for (const ext of external) {
      const r = await resolver.txt(`${foundAt}._report._dmarc.${ext}`);
      if (r.exhausted) break;
      if (r.records.some((x) => /^v=DMARC1/i.test(x.trim()))) {
        issues.push({ status: 'pass', message: `External report destination ${ext} has authorized receiving reports.` });
      } else {
        issues.push({ status: 'warn', message: `Reports go to ${ext}, but it has not published ${foundAt}._report._dmarc.${ext}. Many receivers will not send reports there.` });
      }
    }
  }

  if (tags.adkim === 's' || tags.aspf === 's') {
    issues.push({ status: 'info', message: 'Strict alignment is set (adkim/aspf = s). Mail from subdomains must match the exact domain.' });
  }

  return { status: worst(issues), record, foundAt, tags, issues };
}

// ---------- DKIM ----------

function describeKey(tags) {
  const type = (tags.k || 'rsa').toLowerCase();
  const p = (tags.p || '').replace(/\s+/g, '');
  if (!p) return { type, bits: null, revoked: true };
  if (type === 'ed25519') return { type, bits: 256, revoked: false };
  try {
    const bytes = atob(p).length;
    const bits = Math.round(((bytes - 38) * 8) / 256) * 256;
    return { type, bits: bits > 0 ? bits : null, revoked: false };
  } catch (e) {
    return { type, bits: null, revoked: false, invalid: true };
  }
}

async function checkDkim(domain, userSelectors, scan) {
  const resolver = makeResolver(BUDGET.dkim);
  const list = [...userSelectors];
  if (scan) COMMON_SELECTORS.forEach((s) => { if (!list.includes(s)) list.push(s); });

  const results = [];
  if (!list.length) {
    return {
      status: 'info', results, checked: 0,
      issues: [{ status: 'info', message: 'No selector given. Enter a selector, or tick "scan common selectors". DKIM selectors cannot be listed from public DNS.' }],
    };
  }

  let skipped = 0;
  for (let idx = 0; idx < list.length; idx += 1) {
    const sel = list[idx];
    const r = await resolver.txt(`${sel}._domainkey.${domain}`);
    if (r.exhausted) {
      skipped = list.length - idx;
      break;
    }
    const rec = r.records.find((x) => /(^|;)\s*p=/i.test(x) || /^v=DKIM1/i.test(x));
    if (!rec) continue;
    const tags = parseTags(rec);
    const key = describeKey(tags);
    results.push({
      selector: sel, host: `${sel}._domainkey.${domain}`, record: rec,
      keyType: key.type, keyBits: key.bits, revoked: key.revoked, testing: /(^|:)y(:|$)/.test(tags.t || ''),
      invalid: !!key.invalid,
    });
  }

  const issues = [];
  const active = results.filter((x) => !x.revoked && !x.invalid);
  if (active.length) {
    issues.push({ status: 'pass', message: `${active.length} DKIM selector${active.length === 1 ? '' : 's'} found: ${active.map((x) => x.selector).join(', ')}.` });
  } else if (results.length) {
    issues.push({ status: 'warn', message: 'DKIM records were found but none are usable (revoked or invalid).' });
  } else {
    issues.push({
      status: userSelectors.length ? 'warn' : 'info',
      message: userSelectors.length
        ? 'None of the selectors you entered published a DKIM key.'
        : 'No DKIM key found on the common selectors. Your provider may use a different selector. Check a message header (the s= value in DKIM-Signature) and enter it above.',
    });
  }
  results.forEach((x) => {
    if (x.revoked) issues.push({ status: 'info', message: `${x.selector}: key is revoked (empty p=).` });
    else if (x.keyType === 'rsa' && x.keyBits && x.keyBits < 1024) issues.push({ status: 'fail', message: `${x.selector}: RSA key is under 1024 bits and easily broken.` });
    else if (x.keyType === 'rsa' && x.keyBits && x.keyBits < 2048) issues.push({ status: 'warn', message: `${x.selector}: about ${x.keyBits}-bit RSA key. Use 2048-bit if your provider supports it.` });
    if (x.testing) issues.push({ status: 'warn', message: `${x.selector}: the t=y flag marks this key as testing, so receivers may ignore failures.` });
  });
  if (skipped) issues.push({ status: 'info', message: `${skipped} selector${skipped === 1 ? ' was' : 's were'} not checked (query budget reached).` });

  return { status: worst(issues), results, checked: list.length - skipped, issues };
}

// ---------- entry point ----------

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== url.host) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
    } catch (e) {
      return json({ error: 'Bad origin.' }, 403);
    }
  }

  const domain = normalizeDomain(url.searchParams.get('domain'));
  if (!domain) return json({ error: 'Please enter a valid public domain name, for example contoso.com.' }, 400);

  const selectors = [...new Set(
    String(url.searchParams.get('selectors') || '')
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[a-z0-9._-]{1,63}$/.test(s)),
  )].slice(0, 5);
  const scan = url.searchParams.get('scan') === '1';

  const cacheKey = new Request(
    `${url.origin}/api/email-auth?domain=${encodeURIComponent(domain)}&selectors=${encodeURIComponent(selectors.join(','))}&scan=${scan ? 1 : 0}`,
    { method: 'GET' },
  );
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let result;
  try {
    const [spf, dkim, dmarc] = await Promise.all([checkSpf(domain), checkDkim(domain, selectors, scan), checkDmarc(domain)]);
    const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
    [spf, dkim, dmarc].forEach((section) => section.issues.forEach((i) => { counts[i.status] += 1; }));
    result = { domain, generatedAt: new Date().toISOString(), counts, spf, dkim, dmarc };
  } catch (e) {
    return json({ error: 'Check failed. Please try again in a moment.' }, 502);
  }

  const response = json(result, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
  if (cache && context.waitUntil) context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
