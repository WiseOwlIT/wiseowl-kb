// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Wise Owl Technologies',
  tagline: 'Practical IT fixes, guides and knowledge base articles for Microsoft, VMware and more',
  favicon: 'img/logo.svg',

  url: 'https://wiseowltechnologies.com',
  baseUrl: '/',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}},
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'}},
  ],
  stylesheets: [
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap',
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: 'kb',
          showLastUpdateTime: false,
        },
        blog: {
          showReadingTime: true,
          blogTitle: 'Wise Owl Blog',
          blogDescription: 'IT news, lessons learned and walkthroughs',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo.svg',
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'Wise Owl Technologies',
        logo: {
          alt: 'Wise Owl Technologies logo',
          src: 'img/logo.svg',
        },
        items: [
          {type: 'docSidebar', sidebarId: 'kbSidebar', position: 'left', label: 'Knowledge Base'},
          {to: '/blog', label: 'Blog', position: 'left'},
          {to: '/kb/about', label: 'About', position: 'left'},
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Knowledge Base',
            items: [
              {label: 'Microsoft', to: '/kb/category/microsoft'},
              {label: 'VMware', to: '/kb/category/vmware'},
              {label: 'Networking', to: '/kb/category/networking'},
            ],
          },
          {
            title: 'More',
            items: [
              {label: 'Blog', to: '/blog'},
              {label: 'About', to: '/kb/about'},
              {label: 'RSS', href: 'https://wiseowltechnologies.com/blog/rss.xml'},
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Wise Owl Technologies. Built with Docusaurus.`,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.vsDark,
        additionalLanguages: ['powershell', 'bash', 'batch', 'ini'],
      },
    }),
};

export default config;
