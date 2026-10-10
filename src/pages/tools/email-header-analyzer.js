import React, {useState} from 'react';
import Layout from '@theme/Layout';
import {analyzeHeaders, reportText, SAMPLE_HEADERS} from '../../utils/emailHeaders.mjs';
import base from './m365-lookup.module.css';
import styles from './email-header-analyzer.module.css';

export default function EmailHeaderAnalyzer() {
  const [input, setInput] = useState('');
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  function analyze(value = input) {
    try { setReport(analyzeHeaders(value)); setMessage('Headers analysed. Results are below.'); }
    catch (error) { setReport(null); setMessage(error.message); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(reportText(report)); setMessage('Analysis copied to your clipboard.'); }
    catch { setMessage('Clipboard access was unavailable. You can select and copy the results below.'); }
  }
  return <Layout title="Email Header Analyzer" description="Read email headers, reported SPF, DKIM and DMARC results, and delivery hops privately in your browser.">
    <main className={base.page}><div className="container">
      <p className={base.kicker}>Wiseowl tools</p>
      <h1 className={base.title}>Email Header Analyzer</h1>
      <p className={base.lead}>Wondering where an email came from, or why it took its time getting here? Paste its headers and we’ll turn the technical bits into a readable overview.</p>
      <section className={base.panel} aria-labelledby="paste-title">
        <h2 id="paste-title" className={base.panelTitle}>Let’s take a look</h2>
        <label htmlFor="email-headers">Original email headers</label>
        <textarea id="email-headers" className={styles.input} value={input} onChange={e => {setInput(e.target.value); setReport(null); setMessage('');}} placeholder={'From: Alex <alex@example.com>\nReceived: ...\nAuthentication-Results: ...'} spellCheck={false} rows={12}/>
        <div className={styles.actions}>
          <button className="button button--primary" onClick={() => analyze()}>Analyze headers</button>
          <button className={base.actionBtn} onClick={() => {setInput(SAMPLE_HEADERS); analyze(SAMPLE_HEADERS);}}>Try an example</button>
          <button className={base.actionBtn} onClick={() => {setInput(''); setReport(null); setMessage('Headers cleared.');}}>Clear</button>
        </div>
        <p className={base.note}>Analysis happens in your browser. This tool doesn’t upload or store your pasted headers. Maximum size: 200 KB.</p>
        <p role="status" aria-live="polite">{message}</p>
      </section>
      {report && <>
        <section className={base.panel}><div className={styles.heading}><h2 className={base.panelTitle}>Message overview</h2><button className={base.actionBtn} onClick={copy}>Copy analysis</button></div>
          <dl className={styles.summary}>{report.summary.map(f => <React.Fragment key={f.name}><dt>{f.name}</dt><dd>{f.values.length ? f.values.map((v, i) => <div key={i}>{v}</div>) : 'Not recorded'}</dd></React.Fragment>)}</dl>
          <p className={base.note}>Encoded subjects and display names are shown as recorded in the original headers.</p>
          {report.warnings.map(w => <p key={w} className={styles.warning}>{w}</p>)}
        </section>
        <section className={base.panel}><h2 className={base.panelTitle}>Reported authentication</h2>
          <p>SPF checks the sending server, DKIM checks a domain’s signature, and DMARC checks alignment with the From domain. These are results recorded by mail servers, rather than checks performed by this tool.</p>
          {report.authentication.length ? <div className={styles.scroll}><table className={styles.table}><thead><tr><th>Check</th><th>Reported result</th><th>Reporting server / details</th></tr></thead><tbody>{report.authentication.map((a, i) => <tr key={i}><td>{a.method}</td><td><span className={`${styles.badge} ${a.result === 'pass' ? styles.pass : ['fail', 'softfail', 'permerror'].includes(a.result) ? styles.fail : ''}`}>{a.result}</span></td><td><strong>{a.source}</strong><div>{a.details || 'No additional details'}</div></td></tr>)}</tbody></table></div> : <p>No supported authentication results were found. Missing results don’t mean a message passed or failed.</p>}
          <p className={base.note}>Only trust results added by your own receiving mail service. Headers can be forged; a “pass” result alone doesn’t prove an email is safe. DKIM signatures and ARC chains are not verified here.</p>
        </section>
        <section className={base.panel}><h2 className={base.panelTitle}>Delivery hops</h2><p>Read from the oldest recorded hop to the newest. Times are shown in UTC; gaps compare adjacent server timestamps.</p>
          {report.hops.length ? <ol className={styles.hops}>{report.hops.map((h, i) => <li key={i}><strong>{h.from} → {h.by}</strong><div>{h.protocol} · {h.timestamp === null ? 'Time unavailable (missing or unsupported date)' : new Date(h.timestamp).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}</div><div>{h.delay === null ? 'No comparable previous timestamp' : h.delay < 0 ? `${Math.abs(h.delay)} seconds backwards — possible clock difference` : `${h.delay} seconds since previous hop`}</div><details><summary>Original Received header</summary><pre className={styles.raw}>{h.raw}</pre></details></li>)}</ol> : <p>No Received headers were found.</p>}
          <p className={base.note}>Recorded gaps can include clock differences and don’t measure every stage of delivery. Hostnames are extracted on a best-effort basis; consult the original field for unusual formats.</p>
        </section>
        <section className={base.panel}><details><summary>All parsed header fields ({report.fields.length})</summary><dl className={styles.summary}>{report.fields.map((f, i) => <React.Fragment key={i}><dt>{f.name}</dt><dd>{f.value}</dd></React.Fragment>)}</dl></details></section>
      </>}
      <section className={base.panel}><h2 className={base.panelTitle}>Finding your headers</h2><p>In Outlook on the web, open the message, select the three-dot menu, then look for <strong>View message details</strong> (sometimes under View). In Gmail, use the message’s three-dot menu and choose <strong>Show original</strong>. Copy the header section into the box above.</p><p>Headers can contain email addresses and internal server names. Take a moment to remove anything private before sharing an analysis with someone else.</p><p className={base.note}>Technical reference: <a href="https://datatracker.ietf.org/doc/html/rfc8601">Authentication-Results (RFC 8601)</a>.</p></section>
    </div></main>
  </Layout>;
}
