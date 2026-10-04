import React, {useCallback, useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import base from './m365-lookup.module.css';
import styles from './email-auth-checker.module.css';

const STATUS_LABEL = {pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info'};

function Badge({status}) {
  return <span className={clsx(base.badge, base[`badge_${status}`])}>{STATUS_LABEL[status]}</span>;
}

function Issues({issues}) {
  return (
    <ul className={base.checks}>
      {issues.map((i, idx) => (
        <li key={idx} className={base.check}>
          <div className={base.checkHead}>
            <Badge status={i.status} />
            <span>{i.message}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Meter({used, limit}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const level = used > limit ? 'over' : used >= 9 ? 'near' : 'ok';
  return (
    <div className={styles.meterWrap}>
      <div className={styles.meterLabel}>
        <strong>{used}</strong> of {limit} DNS lookups
      </div>
      <div className={styles.meter} role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit}>
        <div className={clsx(styles.meterFill, styles[`meter_${level}`])} style={{width: `${pct}%`}} />
      </div>
    </div>
  );
}

// ---------- generators (run entirely in the browser) ----------

const SPF_PROVIDERS = [
  {id: 'm365', label: 'Microsoft 365', term: 'include:spf.protection.outlook.com'},
  {id: 'google', label: 'Google Workspace', term: 'include:_spf.google.com'},
  {id: 'sendgrid', label: 'SendGrid', term: 'include:sendgrid.net'},
  {id: 'mailgun', label: 'Mailgun', term: 'include:mailgun.org'},
  {id: 'ses', label: 'Amazon SES', term: 'include:amazonses.com'},
  {id: 'mailchimp', label: 'Mailchimp', term: 'include:servers.mcsv.net'},
  {id: 'salesforce', label: 'Salesforce', term: 'include:_spf.salesforce.com'},
];

const splitList = (text) =>
  text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

function SpfGenerator({copyText, copied}) {
  const [picked, setPicked] = useState({m365: true});
  const [custom, setCustom] = useState('');
  const [ips, setIps] = useState('');
  const [useMx, setUseMx] = useState(false);
  const [useA, setUseA] = useState(false);
  const [policy, setPolicy] = useState('~all');

  const {record, minLookups, problems} = useMemo(() => {
    const terms = [];
    const problems = [];
    let lookups = 0;
    if (useMx) {
      terms.push('mx');
      lookups += 1;
    }
    if (useA) {
      terms.push('a');
      lookups += 1;
    }
    SPF_PROVIDERS.forEach((p) => {
      if (picked[p.id]) {
        terms.push(p.term);
        lookups += 1;
      }
    });
    splitList(custom).forEach((d) => {
      const domain = d.replace(/^include:/i, '').toLowerCase();
      if (/^[a-z0-9._-]+\.[a-z]{2,}$/.test(domain)) {
        terms.push(`include:${domain}`);
        lookups += 1;
      } else {
        problems.push(`"${d}" is not a valid domain for include.`);
      }
    });
    splitList(ips).forEach((ip) => {
      const bare = ip.replace(/^ip[46]:/i, '');
      if (/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(bare)) terms.push(`ip4:${bare}`);
      else if (/^[0-9a-f:]+(\/\d{1,3})?$/i.test(bare) && bare.includes(':')) terms.push(`ip6:${bare}`);
      else problems.push(`"${ip}" is not a valid IPv4 or IPv6 address.`);
    });
    return {record: `v=spf1 ${[...terms, policy].join(' ')}`, minLookups: lookups, problems};
  }, [picked, custom, ips, useMx, useA, policy]);

  return (
    <section className={base.panel}>
      <h2 className={base.panelTitle}>SPF record generator</h2>
      <p className={base.note}>Choose everything that sends email as your domain. Publish the result as a single TXT record at the root of the domain.</p>

      <div className={styles.grid}>
        {SPF_PROVIDERS.map((p) => (
          <label key={p.id} className={styles.check}>
            <input type="checkbox" checked={!!picked[p.id]} onChange={(e) => setPicked({...picked, [p.id]: e.target.checked})} />
            {p.label}
          </label>
        ))}
        <label className={styles.check}>
          <input type="checkbox" checked={useMx} onChange={(e) => setUseMx(e.target.checked)} />
          Servers in my MX records
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={useA} onChange={(e) => setUseA(e.target.checked)} />
          My domain's A record
        </label>
      </div>

      <label className={styles.field}>
        Other services to include (domains, one per line or comma separated)
        <textarea className={styles.textarea} rows={2} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="spf.example-mailer.com" />
      </label>
      <label className={styles.field}>
        IP addresses or ranges (IPv4 or IPv6)
        <textarea className={styles.textarea} rows={2} value={ips} onChange={(e) => setIps(e.target.value)} placeholder="203.0.113.10, 198.51.100.0/24" />
      </label>
      <label className={styles.field}>
        What should happen to mail from other servers?
        <select className={styles.select} value={policy} onChange={(e) => setPolicy(e.target.value)}>
          <option value="~all">~all: soft fail (recommended while testing)</option>
          <option value="-all">-all: hard fail (reject, once every sender is listed)</option>
          <option value="?all">?all: neutral (no protection)</option>
        </select>
      </label>

      {problems.map((p) => (
        <div key={p} className={base.error} role="alert">{p}</div>
      ))}

      <div className={styles.output}>
        <code>{record}</code>
        <button type="button" className={base.copyIcon} onClick={() => copyText(record, 'spf')}>
          {copied === 'spf' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={base.note}>
        Uses at least <strong>{minLookups}</strong> of 10 DNS lookups. Each include can use more inside its own record, so paste the
        published result into the checker for the true count. Publish it at the root of your domain (host <code>@</code>) as a TXT record.
      </p>
    </section>
  );
}

function DmarcGenerator({copyText, copied}) {
  const [policy, setPolicy] = useState('none');
  const [subPolicy, setSubPolicy] = useState('');
  const [pct, setPct] = useState(100);
  const [rua, setRua] = useState('');
  const [ruf, setRuf] = useState('');
  const [adkim, setAdkim] = useState('r');
  const [aspf, setAspf] = useState('r');

  const {record, problems} = useMemo(() => {
    const problems = [];
    const mails = (text, label) =>
      splitList(text)
        .map((e) => e.replace(/^mailto:/i, ''))
        .filter((e) => {
          const ok = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e);
          if (!ok) problems.push(`${label}: "${e}" is not a valid email address.`);
          return ok;
        })
        .map((e) => `mailto:${e}`);

    const parts = ['v=DMARC1', `p=${policy}`];
    if (subPolicy) parts.push(`sp=${subPolicy}`);
    const n = Math.max(0, Math.min(100, parseInt(pct, 10) || 0));
    if (n !== 100) parts.push(`pct=${n}`);
    const ruaList = mails(rua, 'Aggregate reports');
    if (ruaList.length) parts.push(`rua=${ruaList.join(',')}`);
    const rufList = mails(ruf, 'Forensic reports');
    if (rufList.length) parts.push(`ruf=${rufList.join(',')}`);
    if (adkim === 's') parts.push('adkim=s');
    if (aspf === 's') parts.push('aspf=s');
    return {record: parts.join('; '), problems};
  }, [policy, subPolicy, pct, rua, ruf, adkim, aspf]);

  return (
    <section className={base.panel}>
      <h2 className={base.panelTitle}>DMARC record generator</h2>
      <p className={base.note}>Start with p=none and read the reports for a few weeks, then move to quarantine and finally reject.</p>

      <div className={styles.twoCol}>
        <label className={styles.field}>
          Policy for your domain (p)
          <select className={styles.select} value={policy} onChange={(e) => setPolicy(e.target.value)}>
            <option value="none">none: monitor only</option>
            <option value="quarantine">quarantine: send failures to junk</option>
            <option value="reject">reject: block failures</option>
          </select>
        </label>
        <label className={styles.field}>
          Policy for subdomains (sp, optional)
          <select className={styles.select} value={subPolicy} onChange={(e) => setSubPolicy(e.target.value)}>
            <option value="">Same as the domain</option>
            <option value="none">none</option>
            <option value="quarantine">quarantine</option>
            <option value="reject">reject</option>
          </select>
        </label>
        <label className={styles.field}>
          Percentage of mail the policy applies to (pct)
          <input className={styles.select} type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} />
        </label>
        <label className={styles.field}>
          Aggregate report address (rua)
          <input className={styles.select} type="text" value={rua} onChange={(e) => setRua(e.target.value)} placeholder="dmarc@yourdomain.com" />
        </label>
        <label className={styles.field}>
          Forensic report address (ruf, optional)
          <input className={styles.select} type="text" value={ruf} onChange={(e) => setRuf(e.target.value)} placeholder="optional" />
        </label>
        <label className={styles.field}>
          DKIM alignment (adkim)
          <select className={styles.select} value={adkim} onChange={(e) => setAdkim(e.target.value)}>
            <option value="r">relaxed (default)</option>
            <option value="s">strict</option>
          </select>
        </label>
        <label className={styles.field}>
          SPF alignment (aspf)
          <select className={styles.select} value={aspf} onChange={(e) => setAspf(e.target.value)}>
            <option value="r">relaxed (default)</option>
            <option value="s">strict</option>
          </select>
        </label>
      </div>

      {problems.map((p) => (
        <div key={p} className={base.error} role="alert">{p}</div>
      ))}

      <div className={styles.output}>
        <code>{record}</code>
        <button type="button" className={base.copyIcon} onClick={() => copyText(record, 'dmarc')}>
          {copied === 'dmarc' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={base.note}>
        Publish as a TXT record with the host <code>_dmarc</code> (full name <code>_dmarc.yourdomain.com</code>).
        If reports go to an address on a different domain, that domain must publish a matching authorization record.
      </p>
    </section>
  );
}

// ---------- page ----------

export default function EmailAuthChecker() {
  const [tab, setTab] = useState('check');
  const [domain, setDomain] = useState('');
  const [selectors, setSelectors] = useState('');
  const [scan, setScan] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  const run = useCallback(async (d, sel, doScan) => {
    const query = d.trim();
    if (!query) {
      setError('Enter a domain name, for example contoso.com.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const qs = new URLSearchParams({domain: query, selectors: sel.trim(), scan: doScan ? '1' : '0'});
      const res = await fetch(`/api/email-auth?${qs.toString()}`);
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
      if (!data) {
        throw new Error('The checker service could not be reached. If you are running the site locally, start it with "npm run pages:dev" instead of "npm start".');
      }
      if (!res.ok) throw new Error(data.error || 'Check failed.');
      setResult(data);
      const url = new URL(window.location.href);
      url.searchParams.set('domain', data.domain);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      setError(e.message || 'Check failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const preset = p.get('domain');
    if (preset) {
      const sel = p.get('selectors') || '';
      setDomain(preset);
      setSelectors(sel);
      run(preset, sel, p.get('scan') !== '0');
    }
  }, [run]);

  const flash = (key) => {
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };
  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(key);
    } catch (e) {
      setError('Copy was blocked by the browser. Select the text and copy it manually.');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `email-auth-${result.domain}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const summaryText = () => {
    if (!result) return '';
    const lines = [`Email authentication check: ${result.domain}`, ''];
    lines.push(`SPF (${result.spf.lookups}/${result.spf.limit} lookups): ${result.spf.record || 'none'}`);
    result.spf.issues.forEach((i) => lines.push(`  [${STATUS_LABEL[i.status]}] ${i.message}`));
    lines.push('', 'DKIM:');
    result.dkim.issues.forEach((i) => lines.push(`  [${STATUS_LABEL[i.status]}] ${i.message}`));
    lines.push('', `DMARC: ${result.dmarc.record || 'none'}`);
    result.dmarc.issues.forEach((i) => lines.push(`  [${STATUS_LABEL[i.status]}] ${i.message}`));
    return lines.join('\n');
  };

  return (
    <Layout
      title="SPF, DKIM and DMARC Checker and Generator"
      description="Check SPF, DKIM and DMARC for any domain, count SPF DNS lookups against the limit of 10, and generate SPF and DMARC records.">
      <main className={base.page}>
        <div className="container">
          <div className={base.kicker}>Free tool</div>
          <h1 className={base.title}>SPF, DKIM and DMARC Checker</h1>
          <p className={base.lead}>
            Check a domain's email authentication, see exactly how many of the 10 allowed SPF DNS lookups it uses, and build new SPF and
            DMARC records.
          </p>

          <div className={styles.tabs} role="tablist">
            {[
              ['check', 'Check a domain'],
              ['spf', 'SPF generator'],
              ['dmarc', 'DMARC generator'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={clsx(styles.tab, tab === id && styles.tabActive)}
                onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'spf' && <SpfGenerator copyText={copyText} copied={copied} />}
          {tab === 'dmarc' && <DmarcGenerator copyText={copyText} copied={copied} />}

          {tab === 'check' && (
            <>
              <section className={base.panel}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(domain, selectors, scan);
                  }}
                  className={base.form}>
                  <input
                    type="text"
                    className={base.input}
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="contoso.com"
                    aria-label="Domain name"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                  <button type="submit" className="button button--primary button--lg" disabled={loading}>
                    {loading ? 'Checking...' : 'Check'}
                  </button>
                </form>
                <div className={styles.options}>
                  <input
                    type="text"
                    className={clsx(base.input, styles.selectorInput)}
                    value={selectors}
                    onChange={(e) => setSelectors(e.target.value)}
                    placeholder="DKIM selector(s), optional: selector1, s1"
                    aria-label="DKIM selectors"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                  <label className={styles.check}>
                    <input type="checkbox" checked={scan} onChange={(e) => setScan(e.target.checked)} />
                    Also scan common DKIM selectors
                  </label>
                </div>
                <p className={base.note}>
                  Uses public DNS only. Nothing is stored; results are cached for 15 minutes. DKIM selectors cannot be listed publicly, so
                  the scan tries about 20 common names. Find your real selector in the <code>s=</code> value of a message's DKIM-Signature header.
                </p>
                {error && (
                  <div className={base.error} role="alert">
                    {error}
                  </div>
                )}
              </section>

              {result && (
                <>
                  <div className={base.actions}>
                    <button type="button" className={base.actionBtn} onClick={() => copyText(summaryText(), 'summary')}>
                      {copied === 'summary' ? 'Copied' : 'Copy summary'}
                    </button>
                    <button type="button" className={base.actionBtn} onClick={downloadJson}>
                      Download JSON
                    </button>
                    <button type="button" className={base.actionBtn} onClick={() => window.print()}>
                      Print
                    </button>
                  </div>

                  <section className={base.panel}>
                    <h2 className={base.panelTitle}>
                      Results for <code>{result.domain}</code>
                    </h2>
                    <div className={styles.summaryRow}>
                      <div><Badge status={result.spf.status} /> <strong>SPF</strong></div>
                      <div><Badge status={result.dkim.status} /> <strong>DKIM</strong></div>
                      <div><Badge status={result.dmarc.status} /> <strong>DMARC</strong></div>
                    </div>
                  </section>

                  <section className={base.panel}>
                    <h2 className={base.panelTitle}>SPF</h2>
                    {result.spf.record && <Meter used={result.spf.lookups} limit={result.spf.limit} />}
                    <Issues issues={result.spf.issues} />
                    {result.spf.record && (
                      <>
                        <h3 className={styles.sub}>Record</h3>
                        <pre className={base.records}>{result.spf.record}</pre>
                        <h3 className={styles.sub}>Include tree</h3>
                        <ul className={styles.tree}>
                          {result.spf.tree.map((n, idx) => (
                            <li key={idx} style={{paddingLeft: `${n.depth * 1.25}rem`}}>
                              <code>{n.domain}</code>
                              <span className={styles.treeMeta}>
                                {n.error ? ` ${n.error}` : n.lookups ? ` ${n.lookups} lookup${n.lookups === 1 ? '' : 's'} here` : ' no further lookups'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </section>

                  <section className={base.panel}>
                    <h2 className={base.panelTitle}>DKIM</h2>
                    <Issues issues={result.dkim.issues} />
                    {result.dkim.results.map((r) => (
                      <div key={r.selector} className={styles.dkimItem}>
                        <strong>{r.selector}</strong>
                        <span className={styles.treeMeta}>
                          {' '}
                          {r.keyType}
                          {r.keyBits ? `, about ${r.keyBits}-bit` : ''}
                          {r.revoked ? ', revoked' : ''}
                        </span>
                        <pre className={base.records}>{r.host}{'\n'}{r.record}</pre>
                      </div>
                    ))}
                  </section>

                  <section className={base.panel}>
                    <h2 className={base.panelTitle}>DMARC</h2>
                    <Issues issues={result.dmarc.issues} />
                    {result.dmarc.record && (
                      <>
                        <h3 className={styles.sub}>Record{result.dmarc.foundAt && result.dmarc.foundAt !== result.domain ? ` (from ${result.dmarc.foundAt})` : ''}</h3>
                        <pre className={base.records}>{result.dmarc.record}</pre>
                      </>
                    )}
                  </section>

                  <p className={base.footnote}>
                    Checked {new Date(result.generatedAt).toLocaleString()}. Based on public DNS and provided as is. Test changes before relying on
                    them, and keep the old record until the new one is confirmed.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
