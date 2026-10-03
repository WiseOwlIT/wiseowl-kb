# Wise Owl Technologies Knowledge Base

A [Docusaurus](https://docusaurus.io) site for IT knowledge base articles and a blog, hosted free on Cloudflare Pages with the source in GitHub.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm start        # live preview at http://localhost:3000
npm run build    # production build into /build (fails on broken internal links)
```

## Write a new article

1. Copy `templates/article-template.md` into `docs/microsoft/`, `docs/vmware/` or `docs/networking/`.
2. Fill in the front matter and content.
3. Commit and push. The site rebuilds automatically.

New folders under `docs/` need a `_category_.json` and a matching entry in `sidebars.js`.

SEO tip: use the exact error message as the title, and write a one-sentence `description`.

## Publish with GitHub + Cloudflare Pages

1. Create a GitHub repository (for example `wiseowl-kb`) and push this folder:

   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/wiseowl-kb.git
   git push -u origin main
   ```

2. In Cloudflare: **Workers & Pages > Create > Pages > Connect to Git** and choose the repo.
3. Build settings:
   - Framework preset: **Docusaurus**
   - Build command: `npm run build`
   - Build output directory: `build`
   - Environment variable: `NODE_VERSION` = `22`
4. After the first deploy, open the project and go to **Custom domains > Set up a custom domain**, then enter `wiseowltechnologies.com`. If your DNS is on Cloudflare this configures itself.

## After launch

- Submit `https://wiseowltechnologies.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools.
- Update the contact details in `docs/about.md`.
- Optional local search: `npm install @easyops-cn/docusaurus-search-local`, then add it under `themes` in `docusaurus.config.js` following that plugin's README.
