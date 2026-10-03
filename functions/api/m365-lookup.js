// Cloudflare Pages Function: GET /api/m365-lookup?domain=example.com
//
// Uses only PUBLIC sources:
//   - Public DNS (via Cloudflare DNS-over-HTTPS)
//   - Public Microsoft endpoints (OpenID configuration, getuserrealm, Exchange Autodiscover)
// Nothing is stored. Responses are cached for 15 minutes in Cloudflare's edge cache.

const DOH_URL = 'https://cloudflare-dns.com/dns-query';
const CACHE_SECONDS = 900;
const TIMEOUT_MS = 7000;

const GUID_RE = /[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i;

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
  // Reject IP addresses and internal-looking names
  if (/^[0-9.]+$/.test(d)) return null;
  if (/\.(local|internal|localhost|lan|home|corp)$/.test(d)) return null;
  return d;
}

async function dns(name, type) {
  const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/dns-json' },
      signal: timeoutSignal(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, status: -1, answers: [] };
    const body = await res.json();
    return { ok: true, status: body.Status, answers: body.Answer || [] };
  } catch (e) {
    return { ok: false, status: -1, answers: [] };
  }
}

const TYPE = { CNAME: 5, MX: 15, TXT: 16 };

function txtValue(data) {
  const parts = [...String(data).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  return parts.length ? parts.join('') : String(data);
}

async function txtRecords(name) {
  const r = await dns(name, 'TXT');
  return r.answers.filter((a) => a.type === TYPE.TXT).map((a) => txtValue(a.data));
}

async function cnameRecords(name) {
  const r = await dns(name, 'CNAME');
  return r.answers
    .filter((a) => a.type === TYPE.CNAME)
    .map((a) => String(a.data).replace(/\.$/, '').toLowerCase());
}

async function mxRecords(domain) {
  const r = await dns(domain, 'MX');
  return r.answers
    .filter((a) => a.type === TYPE.MX)
    .map((a) => {
      const [pref, host] = String(a.data).trim().split(/\s+/);
      return { preference: parseInt(pref, 10), host: String(host || '').replace(/\.$/, '').toLowerCase() };
    })
    .sort((a, b) => a.preference - b.preference);
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: timeoutSignal(TIMEOUT_MS), headers: { accept: 'application/json' } });
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: null };
  }
}

// ---------- Microsoft public endpoints ----------

async function lookupTenant(domain) {
  const clouds = [
    { host: 'login.microsoftonline.com', label: 'Commercial' },
    { host: 'login.microsoftonline.us', label: 'US Government' },
    { host: 'login.partner.microsoftonline.cn', label: 'China (21Vianet)' },
  ];
  for (const cloud of clouds) {
    const url = `https://${cloud.host}/${encodeURIComponent(domain)}/v2.0/.well-known/openid-configuration`;
    const { status, body } = await fetchJson(url);
    if (status === 200 && body && body.issuer) {
      const match = String(body.issuer).match(GUID_RE);
      return {
        found: true,
        tenantId: match ? match[0].toLowerCase() : null,
        region: body.tenant_region_scope || null,
        regionSubScope: body.tenant_region_sub_scope || null,
        cloudInstance: body.cloud_instance_name || cloud.host.replace(/^login\./, ''),
        cloudLabel: cloud.label,
      };
    }
  }
  return { found: false };
}

async function lookupRealm(domain) {
  const url = `https://login.microsoftonline.com/getuserrealm.srf?login=${encodeURIComponent('user@' + domain)}&json=1`;
  const { status, body } = await fetchJson(url);
  if (status !== 200 || !body) return null;
  let idpHost = null;
  if (body.AuthURL) {
    try {
      idpHost = new URL(body.AuthURL).hostname;
    } catch (e) {
      idpHost = null;
    }
  }
  return {
    namespaceType: body.NameSpaceType || null, // Managed | Federated | Unknown | NoNamespace
    brandName: body.FederationBrandName || null,
    idpHost,
    protocol: body.federation_protocol || null,
  };
}

async function lookupAcceptedDomains(domain) {
  const endpoint = 'https://autodiscover-s.outlook.com/autodiscover/autodiscover.svc';
  const action = 'http://schemas.microsoft.com/exchange/2010/Autodiscover/Autodiscover/GetFederationInformation';
  const envelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:exm="http://schemas.microsoft.com/exchange/services/2006/messages" ' +
    'xmlns:ext="http://schemas.microsoft.com/exchange/services/2006/types" ' +
    'xmlns:a="http://www.w3.org/2005/08/addressing" ' +
    'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    '<soap:Header>' +
    `<a:Action soap:mustUnderstand="1">${action}</a:Action>` +
    `<a:To soap:mustUnderstand="1">${endpoint}</a:To>` +
    '<a:ReplyTo><a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address></a:ReplyTo>' +
    '</soap:Header><soap:Body>' +
    '<GetFederationInformationRequestMessage xmlns="http://schemas.microsoft.com/exchange/2010/Autodiscover">' +
    `<Request><Domain>${domain}</Domain></Request>` +
    '</GetFederationInformationRequestMessage></soap:Body></soap:Envelope>';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml; charset=utf-8',
        soapaction: `"${action}"`,
        'user-agent': 'AutodiscoverClient',
      },
      body: envelope,
      signal: timeoutSignal(TIMEOUT_MS + 2000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const domains = [...xml.matchAll(/<Domain>([^<]+)<\/Domain>/g)].map((m) => m[1].toLowerCase());
    return [...new Set(domains)];
  } catch (e) {
    return [];
  }
}

// ---------- classification ----------

const GATEWAYS = [
  [/pphosted\.com$|ppe-hosted\.com$|proofpoint\.com$/, 'Proofpoint'],
  [/mimecast(-offshore)?\.com$/, 'Mimecast'],
  [/barracudanetworks\.com$|cudasvc\.com$/, 'Barracuda'],
  [/messagelabs\.com$|symanteccloud\.com$/, 'Symantec Email Security (MessageLabs)'],
  [/iphmx\.com$/, 'Cisco Secure Email (IronPort)'],
  [/tmes\.trendmicro\.(com|eu)$|trendmicro\.com$/, 'Trend Micro Email Security'],
  [/hydra\.sophos\.com$|reflexion\.net$/, 'Sophos Email'],
  [/forcepoint\.(com|net)$|mailcontrol\.com$/, 'Forcepoint'],
  [/fireeyecloud\.com$|trellix\.com$/, 'Trellix (FireEye)'],
  [/mailanyone\.net$|mxthunder\.(com|net)$/, 'SpamHero / MailAnyone'],
  [/spamh\.com$|mxlogic\.net$/, 'McAfee / SpamHero'],
  [/sendgrid\.net$/, 'Twilio SendGrid'],
  [/mx\.cloudflare\.net$/, 'Cloudflare Email Routing'],
  [/zoho\.(com|eu|in|com\.au)$/, 'Zoho Mail'],
  [/protonmail\.ch$|proton\.me$/, 'Proton Mail'],
  [/secureserver\.net$/, 'GoDaddy Email'],
  [/emailsrvr\.com$/, 'Rackspace Email'],
  [/yahoodns\.net$/, 'Yahoo Mail'],
];

function isExchangeOnlineHost(h) {
  return /mail\.protection\.(outlook\.com|outlook\.de|office365\.us)$|mail\.eo\.outlook\.com$/.test(h);
}

function isGoogleHost(h) {
  return /(^|\.)(google|googlemail)\.com$/.test(h);
}

function detectGateway(mx) {
  if (!mx.length) return { name: 'None (no MX records)', kind: 'none' };
  if (mx.some((m) => isExchangeOnlineHost(m.host))) {
    return { name: 'Microsoft Exchange Online Protection (direct)', kind: 'exo' };
  }
  for (const m of mx) {
    if (isGoogleHost(m.host)) return { name: 'Google Workspace / Gmail', kind: 'google' };
  }
  for (const m of mx) {
    for (const [re, name] of GATEWAYS) {
      if (re.test(m.host)) return { name, kind: 'gateway' };
    }
  }
  return { name: `Not recognized (${mx[0].host})`, kind: 'other' };
}

function classifyPlatform({ mx, gateway, tenant, spf, exoRegistered }) {
  if (!mx.length) return 'No MX records found. This domain does not appear to receive email.';
  if (gateway.kind === 'exo') return 'Exchange Online (MX points directly to Microsoft 365).';
  if (gateway.kind === 'google') return 'Google Workspace / Gmail.';
  const spfMicrosoft = spf && /include:spf\.protection\.outlook\.com/i.test(spf);
  if (spfMicrosoft) {
    return `Exchange Online likely in use (SPF authorizes Microsoft 365), filtered through ${gateway.name.startsWith('Not recognized') ? 'a third-party gateway' : gateway.name}.`;
  }
  if (tenant.found || exoRegistered) {
    return 'Entra ID tenant exists. Mail does not appear to be hosted in Exchange Online.';
  }
  return 'No Microsoft 365 tenant found. Mail appears to be hosted elsewhere.';
}

// ---------- email authentication checks ----------

function checkSpf(records) {
  const spfs = records.filter((r) => /^v=spf1(\s|$)/i.test(r));
  if (spfs.length === 0) {
    return { status: 'fail', detail: 'No SPF record found. Receivers cannot verify which servers may send for this domain.', records: [], spf: null };
  }
  if (spfs.length > 1) {
    return { status: 'fail', detail: 'Multiple SPF records found. Only one is allowed; receivers return a permanent error.', records: spfs, spf: spfs[0] };
  }
  const spf = spfs[0];
  const terms = spf.split(/\s+/).slice(1);
  const lookups = terms.filter((t) => /^[+\-~?]?(include:|a(:|\/|$)|mx(:|\/|$)|ptr(:|$)|exists:|redirect=)/i.test(t)).length;
  const all = terms.find((t) => /^[+\-~?]?all$/i.test(t));
  let status = 'pass';
  let detail = 'SPF record found with a strict policy (-all).';
  if (!all) {
    const redirect = terms.find((t) => /^redirect=/i.test(t));
    status = redirect ? 'info' : 'warn';
    detail = redirect ? `SPF delegates to ${redirect.slice(9)} via redirect.` : 'SPF record has no "all" mechanism, so unlisted senders are not restricted.';
  } else if (all.startsWith('~')) {
    status = 'warn';
    detail = 'SPF uses softfail (~all). Consider moving to -all once all legitimate senders are listed.';
  } else if (all.startsWith('?')) {
    status = 'warn';
    detail = 'SPF uses neutral (?all), which provides no protection.';
  } else if (all.startsWith('+') || all.toLowerCase() === 'all') {
    status = 'fail';
    detail = 'SPF allows any sender (+all). This effectively disables SPF.';
  }
  if (lookups > 10) {
    status = status === 'fail' ? 'fail' : 'warn';
    detail += ` Top-level record already has ${lookups} DNS-lookup terms (limit is 10 including nested includes).`;
  }
  if (terms.some((t) => /^[+\-~?]?ptr(:|$)/i.test(t))) {
    if (status === 'pass') status = 'warn';
    detail += ' The ptr mechanism is discouraged.';
  }
  return { status, detail, records: [spf], spf };
}

function checkDmarc(records) {
  const dmarcs = records.filter((r) => /^v=DMARC1\b/i.test(r.trim()));
  if (dmarcs.length === 0) {
    return { status: 'fail', detail: 'No DMARC record found at _dmarc. Spoofed mail is not blocked and no reports are sent.', records: [] };
  }
  const rec = dmarcs[0];
  const tags = {};
  rec.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) tags[k.trim().toLowerCase()] = v.join('=').trim();
  });
  const policy = (tags.p || '').toLowerCase();
  const pct = tags.pct ? parseInt(tags.pct, 10) : 100;
  let status = 'pass';
  let detail = `DMARC policy is p=${policy}.`;
  if (policy === 'none') {
    status = 'warn';
    detail = 'DMARC policy is p=none (monitoring only). Move to quarantine or reject when ready.';
  } else if (policy !== 'quarantine' && policy !== 'reject') {
    status = 'warn';
    detail = 'DMARC record has a missing or invalid p= tag.';
  } else if (pct < 100) {
    status = 'warn';
    detail += ` Only ${pct}% of mail is subject to the policy (pct=${pct}).`;
  }
  if (!tags.rua) detail += ' No aggregate report address (rua) is set.';
  return { status, detail, records: [rec] };
}

function checkDkim(selector1, selector2, platformKind) {
  const ok = (arr) => arr.some((c) => c.includes('_domainkey') && c.endsWith('onmicrosoft.com'));
  const s1 = ok(selector1);
  const s2 = ok(selector2);
  const records = [...selector1.map((c) => `selector1._domainkey -> ${c}`), ...selector2.map((c) => `selector2._domainkey -> ${c}`)];
  if (s1 && s2) {
    return { status: 'pass', detail: 'Microsoft 365 DKIM selectors (selector1 and selector2) are published.', records };
  }
  if (s1 || s2) {
    return { status: 'warn', detail: 'Only one Microsoft 365 DKIM selector is published. Both are needed for key rotation.', records };
  }
  if (platformKind === 'exo') {
    return { status: 'warn', detail: 'Microsoft 365 DKIM selectors were not found. Enable DKIM signing for this domain in the Defender portal.', records };
  }
  return { status: 'info', detail: 'Microsoft 365 DKIM selectors not found. Other DKIM selectors may be in use; they cannot be enumerated publicly.', records };
}

function tally(checks) {
  const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
  checks.forEach((c) => {
    counts[c.status] += 1;
  });
  return counts;
}

// ---------- main lookup ----------

async function runLookup(domain) {
  const [
    tenant,
    realm,
    acceptedDomains,
    mx,
    rootTxt,
    dmarcTxt,
    dkim1,
    dkim2,
    mtaSts,
    tlsRpt,
    bimi,
    autodiscoverCname,
  ] = await Promise.all([
    lookupTenant(domain),
    lookupRealm(domain),
    lookupAcceptedDomains(domain),
    mxRecords(domain),
    txtRecords(domain),
    txtRecords(`_dmarc.${domain}`),
    cnameRecords(`selector1._domainkey.${domain}`),
    cnameRecords(`selector2._domainkey.${domain}`),
    txtRecords(`_mta-sts.${domain}`),
    txtRecords(`_smtp._tls.${domain}`),
    txtRecords(`default._bimi.${domain}`),
    cnameRecords(`autodiscover.${domain}`),
  ]);

  const gateway = detectGateway(mx);
  const spfResult = checkSpf(rootTxt);
  // Only trust the Autodiscover answer when it names a *.onmicrosoft.com tenant domain
  const exoRegistered = acceptedDomains.some((d) => /\.onmicrosoft\.com$/.test(d));

  const initialDomain =
    acceptedDomains.find((d) => /\.onmicrosoft\.com$/.test(d) && !/\.mail\.onmicrosoft\.com$/.test(d)) || null;

  let authType = 'Not found';
  if (realm && realm.namespaceType) {
    const t = realm.namespaceType;
    authType = t === 'Managed' || t === 'Federated' ? t : t === 'Unknown' ? 'Not found' : t;
  } else if (tenant.found) {
    authType = 'Unknown';
  }

  const msTxt = rootTxt.filter((r) => /^MS=ms\d+/i.test(r));

  const checks = [
    { category: 'Email authentication', name: 'SPF', ...(({ status, detail, records }) => ({ status, detail, records }))(spfResult) },
    { category: 'Email authentication', name: 'DKIM', ...checkDkim(dkim1, dkim2, gateway.kind) },
    { category: 'Email authentication', name: 'DMARC', ...checkDmarc(dmarcTxt) },
    {
      category: 'Email authentication',
      name: 'MTA-STS',
      status: 'info',
      detail: mtaSts.some((r) => /^v=STSv1/i.test(r))
        ? 'MTA-STS record is published, which enforces TLS for inbound mail.'
        : 'No MTA-STS record found. Optional, but it protects inbound mail from downgrade attacks.',
      records: mtaSts,
    },
    {
      category: 'Email authentication',
      name: 'TLS-RPT',
      status: 'info',
      detail: tlsRpt.some((r) => /^v=TLSRPTv1/i.test(r))
        ? 'TLS reporting is configured.'
        : 'No TLS-RPT record found. Optional companion to MTA-STS.',
      records: tlsRpt,
    },
    {
      category: 'Email authentication',
      name: 'BIMI',
      status: 'info',
      detail: bimi.some((r) => /^v=BIMI1/i.test(r))
        ? 'BIMI record is published.'
        : 'No BIMI record found. Optional brand logo display in supporting mail clients.',
      records: bimi,
    },
    {
      category: 'Microsoft 365 records',
      name: 'Autodiscover',
      status: 'info',
      detail: autodiscoverCname.length
        ? /outlook\.com$/.test(autodiscoverCname[0])
          ? 'autodiscover points to Exchange Online.'
          : `autodiscover points to ${autodiscoverCname[0]}.`
        : 'No autodiscover CNAME found.',
      records: autodiscoverCname,
    },
    {
      category: 'Microsoft 365 records',
      name: 'Domain verification',
      status: 'info',
      detail: msTxt.length
        ? 'A Microsoft domain verification TXT record (MS=) is present.'
        : 'No Microsoft domain verification TXT record (MS=) found at the root.',
      records: msTxt,
    },
  ];

  const counts = tally(checks);

  return {
    domain,
    generatedAt: new Date().toISOString(),
    summary: {
      emailPlatform: classifyPlatform({ mx, gateway, tenant, spf: spfResult.spf, exoRegistered }),
      emailGateway: gateway.name,
      tenantFound: tenant.found || exoRegistered,
      tenantName: realm && realm.brandName ? realm.brandName : null,
      tenantId: tenant.found ? tenant.tenantId : null,
      initialDomain,
      authenticationType: authType,
      identityProvider: realm && realm.idpHost ? realm.idpHost : null,
      tenantRegion: tenant.found ? [tenant.region, tenant.regionSubScope].filter(Boolean).join(' / ') || null : null,
      cloudInstance: tenant.found ? tenant.cloudInstance : null,
      acceptedDomainCount: exoRegistered ? acceptedDomains.length : null,
    },
    counts,
    checks,
    dns: {
      mx: mx.map((m) => `${m.preference} ${m.host}`),
      txt: rootTxt,
    },
  };
}

// ---------- Pages Function entry point ----------

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Same-origin use only
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== url.host) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
    } catch (e) {
      return json({ error: 'Bad origin.' }, 403);
    }
  }

  const domain = normalizeDomain(url.searchParams.get('domain'));
  if (!domain) {
    return json({ error: 'Please enter a valid public domain name, for example contoso.com.' }, 400);
  }

  const cacheKey = new Request(`${url.origin}/api/m365-lookup?domain=${encodeURIComponent(domain)}`, { method: 'GET' });
  const cache = typeof caches !== 'undefined' ? caches.default : null;

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let result;
  try {
    result = await runLookup(domain);
  } catch (e) {
    return json({ error: 'Lookup failed. Please try again in a moment.' }, 502);
  }

  const response = json(result, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
  if (cache && context.waitUntil) {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}
