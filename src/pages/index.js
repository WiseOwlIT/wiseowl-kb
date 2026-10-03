import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const categories = [
  {
    title: 'Microsoft',
    icon: '🪟',
    to: '/kb/category/microsoft',
    text: 'Windows Server, Active Directory, Microsoft 365 and Azure fixes and walkthroughs.',
  },
  {
    title: 'VMware',
    icon: '🖥️',
    to: '/kb/category/vmware',
    text: 'ESXi, vCenter and virtualization troubleshooting from real environments.',
  },
  {
    title: 'Networking',
    icon: '🌐',
    to: '/kb/category/networking',
    text: 'DNS, DHCP, routing and connectivity problems, explained step by step.',
  },
];

const pillars = [
  {num: '01', title: 'Symptoms first', text: 'Exact error text so you can match your problem fast.'},
  {num: '02', title: 'Tested steps', text: 'Copy-and-paste commands with the reasoning behind them.'},
  {num: '03', title: 'Free for all', text: 'Open knowledge, shared to help the IT community.'},
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  const logo = useBaseUrl('/img/logo.svg');
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.logoWrap}>
          <img src={logo} alt="Wise Owl Technologies logo" className={styles.heroLogo} width="96" height="96" />
        </div>
        <div>
          <span className={styles.badge}>IT Knowledge Base</span>
        </div>
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/kb/intro">
            Browse the Knowledge Base
          </Link>
          <Link className={clsx('button button--lg', styles.ghostButton)} to="/blog">
            Read the Blog
          </Link>
        </div>
        <div className={styles.terminal} aria-hidden="true">
          <div className={styles.terminalBar}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <pre className={styles.terminalBody}>
            <span className={styles.prompt}>PS&gt;</span> repadmin /replsummary{'\n'}
            <span className={styles.ok}>[ok]</span> 0 failures, replication healthy{'\n'}
            <span className={styles.prompt}>PS&gt;</span> <span className={styles.cursor} />
          </pre>
        </div>
      </div>
    </header>
  );
}

function CategoryCards() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.sectionKicker}>Categories</div>
        <h2 className={styles.sectionTitle}>Find your fix</h2>
        <div className="row">
          {categories.map((c) => (
            <div key={c.title} className="col col--4 margin-bottom--lg">
              <Link to={c.to} className={styles.card}>
                <div className={styles.cardIcon} aria-hidden="true">{c.icon}</div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <span className={styles.cardLink}>Explore {c.title} →</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className={clsx(styles.section, styles.features)}>
      <div className="container">
        <div className="row">
          {pillars.map((p) => (
            <div key={p.num} className="col col--4">
              <div className={styles.feature}>
                <div className={styles.featureNum}>{p.num}</div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Mission() {
  return (
    <section className={clsx(styles.section, styles.mission)}>
      <div className="container">
        <div className={styles.sectionKicker}>Mission</div>
        <h2 className={styles.sectionTitle}>Sharing what works</h2>
        <p className={styles.missionText}>
          Every article here comes from hands-on IT work: clear symptoms, tested steps and the
          reasoning behind each fix. Written to help the IT community learn faster and
          troubleshoot with confidence.
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="IT Knowledge Base and Help Articles"
      description="Practical IT fixes, guides and knowledge base articles for Microsoft, VMware, networking and more from Wise Owl Technologies.">
      <Hero />
      <main>
        <CategoryCards />
        <Pillars />
        <Mission />
      </main>
    </Layout>
  );
}
