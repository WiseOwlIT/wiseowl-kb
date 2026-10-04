import React, {useState} from 'react';
import CodeBlock from '@theme/CodeBlock';
import useBaseUrl from '@docusaurus/useBaseUrl';
import script from '@site/static/scripts/reset-windows-update.bat';
import styles from './styles.module.css';

export default function ScriptViewer() {
  const [status, setStatus] = useState('');
  const downloadUrl = useBaseUrl('/scripts/reset-windows-update.bat');
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(script);
      setStatus('Copied! Paste it into Notepad and save it as reset-windows-update.bat.');
    } catch {
      setStatus('Copy is unavailable in this browser. Use Download .bat, or select the code below and copy it manually.');
    }
  }
  return (
    <section className={styles.viewer} aria-label="Windows Update reset script">
      <div className={styles.toolbar}>
        <div><strong>reset-windows-update.bat</strong><div className={styles.meta}>Windows batch script · Administrator required · Restart afterwards</div></div>
        <div className={styles.actions}>
          <button type="button" className="button button--primary" onClick={copyCode}>Copy code</button>
          <a className="button button--secondary" href={downloadUrl} download="reset-windows-update.bat">Download .bat</a>
        </div>
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status || 'Read through the script before running it on your PC.'}</p>
      <CodeBlock language="batch" title="Script preview">{script}</CodeBlock>
    </section>
  );
}
