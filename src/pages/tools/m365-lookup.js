import React, {useCallback, useEffect, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import styles from './m365-lookup.module.css';

const STATUS_LABEL = {pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info'};

function Badge({status}) {
  return <span className={clsx(styles.badge, styles[`badge_${status}`])}>{STATUS_LABEL[status]}</span>;
}

function summaryRows(result) {
  const s = result.summary;
  const auth = s.identityProvider
    ? `${s.authenticationType} (identity provider: ${s.identityProvider})`
    : s.authenticationType;
  return [
    ['Email platform', s.emailPlatform],
    ['Email gateway', s.emailGateway],
    ['Entra tenant found', s.tenantFound ? 'Yes' : 'No'],
    ['Tenant name', s.tenantName || 'Not published'],
    ['Tenant ID', s.tenantId || 'Not found', 'copy'],
    ['Initial domain', s.initialDomain || 'Not found'],
    ['Authentication type', auth],
    ['Tenant region', s.tenantRegion || 'Not found'],
    ['Cloud instance', s.cloudInstance || 'Not found'],
    [
      'Results',
      `${result.counts.pass} Pass, ${result.counts.warn} Warning, ${result.counts.fail} Fail, ${result.counts.info} Info`,
    ],
  ];
}

function buildSummaryText(result) {
  const lines = [`Microsoft 365 lookup: ${result.domain}`, ''];
  summaryRows(result).forEach(([label, value]) => lines.push(`${label}: ${value}`));
  lines.push('', 'Checks:');
  result.checks.forEach((c) => lines.push(`- [${STATUS_LABEL[c.status]}] ${c.name}: ${c.detail}`));
  return lines.join('\n');
}

export default function M365Lookup() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  const runLookup = useCallback(async (value) => {
    const query = value.trim();
    if (!query) {
      setError('Enter a domain name, for example contoso.com.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/m365-lookup?domain=${encodeURIComponent(query)}`);
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
      if (!data) {
        throw new Error(
          'The lookup service could not be reached. If you are running the site locally, start it with "npm run pages:dev" instead of "npm start".',
        );
      }
      if (!res.ok) throw new Error(data.error || 'Lookup failed.');
      setResult(data);
      const url = new URL(window.location.href);
      url.searchParams.set('domain', data.domain);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      setError(e.message || 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Support deep links such as /tools/m365-lookup?domain=contoso.com
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('domain');
    if (preset) {
      setDomain(preset);
      runLookup(preset);
    }
  }, [runLookup]);

  const onSubmit = (event) => {
    event.preventDefault();
    runLookup(domain);
  };

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
    a.download = `m365-lookup-${result.domain}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const categories = result ? [...new Set(result.checks.map((c) => c.category))] : [];

  return (
    <Layout
      title="Microsoft 365 Domain and Tenant Lookup"
      description="Find the Microsoft 365 tenant ID, federation status, email platform, email gateway and email authentication (SPF, DKIM, DMARC) for any domain.">
      <main className={styles.page}>
        <div className="container">
          <div className={styles.kicker}>Free tool</div>
          <h1 className={styles.title}>Microsoft 365 Domain and Tenant Lookup</h1>
          <p className={styles.lead}>
            Find the tenant ID, federation status, email platform, gateway and email authentication
            posture for any domain.
          </p>

          <section className={styles.panel}>
            <form onSubmit={onSubmit} className={styles.form}>
              <input
                type="text"
                className={styles.input}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="contoso.com"
                aria-label="Domain name"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
              />
              <button type="submit" className="button button--primary button--lg" disabled={loading}>
                {loading ? 'Looking up...' : 'Look up'}
              </button>
            </form>
            <p className={styles.note}>
              Lookups use public DNS and public Microsoft endpoints only. Results are cached for 15
              minutes and are not stored after that.
            </p>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
          </section>

          {result && (
            <>
              <div className={styles.actions}>
                <button type="button" className={styles.actionBtn} onClick={() => copyText(buildSummaryText(result), 'summary')}>
                  {copied === 'summary' ? 'Copied' : 'Copy summary'}
                </button>
                <button type="button" className={styles.actionBtn} onClick={downloadJson}>
                  Download JSON
                </button>
                <button type="button" className={styles.actionBtn} onClick={() => window.print()}>
                  Print
                </button>
              </div>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>
                  Summary: <code>{result.domain}</code>
                </h2>
                <table className={styles.table}>
                  <tbody>
                    {summaryRows(result).map(([label, value, kind]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>
                          {kind === 'copy' && result.summary.tenantId ? (
                            <>
                              <code>{value}</code>
                              <button
                                type="button"
                                className={styles.copyIcon}
                                onClick={() => copyText(value, 'tenant')}
                                aria-label="Copy tenant ID">
                                {copied === 'tenant' ? 'Copied' : 'Copy'}
                              </button>
                            </>
                          ) : label === 'Initial domain' && result.summary.initialDomain ? (
                            <code>{value}</code>
                          ) : (
                            value
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {categories.map((cat) => (
                <section className={styles.panel} key={cat}>
                  <h2 className={styles.panelTitle}>{cat}</h2>
                  <ul className={styles.checks}>
                    {result.checks
                      .filter((c) => c.category === cat)
                      .map((c) => (
                        <li key={c.name} className={styles.check}>
                          <div className={styles.checkHead}>
                            <Badge status={c.status} />
                            <strong>{c.name}</strong>
                          </div>
                          <p className={styles.checkDetail}>{c.detail}</p>
                          {c.records && c.records.length > 0 && (
                            <pre className={styles.records}>{c.records.join('\n')}</pre>
                          )}
                        </li>
                      ))}
                  </ul>
                </section>
              ))}

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>MX records</h2>
                {result.dns.mx.length ? (
                  <pre className={styles.records}>{result.dns.mx.join('\n')}</pre>
                ) : (
                  <p className={styles.checkDetail}>No MX records found.</p>
                )}
              </section>

              <p className={styles.footnote}>
                Checked {new Date(result.generatedAt).toLocaleString()}. Information comes from public
                DNS and Microsoft endpoints and is provided as is. Verify important changes in your
                own tenant before acting.
              </p>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}
