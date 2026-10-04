import React, {useState} from 'react';
import CodeBlock from '@theme/CodeBlock';
import useBaseUrl from '@docusaurus/useBaseUrl';
import defaultScript from '@site/static/scripts/reset-windows-update.bat';
import styles from './styles.module.css';

export default function ScriptViewer({script = defaultScript, filename = 'reset-windows-update.bat', language = 'batch', details = 'Windows batch script · Administrator required · Restart afterwards'}) {
  const [status, setStatus] = useState('');
  const downloadUrl = useBaseUrl(`/scripts/${filename}`);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(script);
      setStatus(`Copied! Paste it into your editor and save it as ${filename}.`);
    } catch {
      setStatus('Copy is unavailable in this browser. Use the download button, or select the code below and copy it manually.');
    }
  }
  return (
    <section className={styles.viewer} aria-label={`${filename} script`}>
      <div className={styles.toolbar}>
        <div><strong>{filename}</strong><div className={styles.meta}>{details}</div></div>
        <div className={styles.actions}>
          <button type="button" className="button button--primary" onClick={copyCode}>Copy code</button>
          <a className="button button--secondary" href={downloadUrl} download={filename}>Download {filename.slice(filename.lastIndexOf('.'))}</a>
        </div>
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status || 'Read through the script before running it on your PC.'}</p>
      <CodeBlock language={language} title="Script preview">{script}</CodeBlock>
    </section>
  );
}
