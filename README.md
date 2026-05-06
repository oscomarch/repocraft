# repocraft

**A local CMS for your `content.jsx` file. Edit in a clean UI. Commit directly to GitHub.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/oscomarch/repocraft?style=flat-square)](https://github.com/oscomarch/repocraft/stargazers)

No database. No CMS account. No build step to edit text. Run one Node.js server locally, open a browser tab, make your changes, and hit save. Your edits land as a real git commit and trigger a redeploy.

It reads a `content.jsx` from your GitHub repo via a personal access token, presents a structured editor for each section of your site, and writes the updated file back to GitHub on every save.

Two files. Zero dependencies. The whole thing is under 800 lines.

---

<!-- screenshot: editor open in browser, sidebar nav visible, essay being edited -->

---

## Quick start

**1. Clone:**

```bash
git clone https://github.com/oscomarch/repocraft.git
cd repocraft
```

**2. Create your `.env`:**

```bash
cp .env.example .env
```

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=yourname/your-site-repo
CONTENT_PATH=content.jsx
GITHUB_BRANCH=main
```

**3. Run:**

```bash
node server.js
```

**4. Open [http://localhost:3747](http://localhost:3747)**

Make your changes. Hit **Commit to GitHub** (or `Cmd+S`). Done.

---

## GitHub token

Go to [github.com/settings/tokens](https://github.com/settings/tokens), create a classic token with the **repo** scope, and paste it into `.env`.

---

## How it works

- `server.js` starts an HTTP server on port 3747. Pure Node.js, no npm install.
- On load, it fetches your `content.jsx` from GitHub via the Contents API and parses the exported variables.
- `index.html` is a single-file React app (via unpkg CDN, no bundler) that renders a section editor for each variable it finds.
- On save, it serializes your edits back into valid JS, base64-encodes it, and commits via a GitHub API `PUT` using the file's current SHA.
- The SHA is tracked between saves so concurrent edits never silently clobber each other.

---

## Content file format

Your `content.jsx` is plain JavaScript: named `const` declarations, then an `Object.assign(window, {...})` at the bottom so the browser can read them.

```js
// content.jsx

const SITE = {
  name: "Jane Smith",
  tag: "Designer and writer based in Berlin.",
  domain: "janesmith.com",
  email: "hi@janesmith.com"
};

const ESSAYS = [
  {
    slug: "on-attention",
    title: "On Attention",
    date: "2024-03-12",
    dateLabel: "Mar 2024",
    readTime: "6 min",
    excerpt: "Attention is the rarest and purest form of generosity.",
    body: [
      "There is a kind of reading that erases you.",
      "You look up and an hour has passed and you are not sure where you went."
    ]
  }
];

const PROJECTS = [
  {
    name: "repocraft",
    year: "2024",
    desc: "A local CMS that commits directly to GitHub.",
    href: "https://github.com/oscomarch/repocraft",
    tags: "open source · node"
  }
];

const EXPERIENCE = [
  {
    role: "Lead Designer",
    where: "Acme Corp",
    when: "2021 to present",
    desc: "Led product design across mobile and web."
  }
];

const NOW = {
  updated: "May 2025",
  blocks: [
    {
      heading: "Working on",
      items: ["repocraft", "A ceramics project"]
    }
  ]
};

const READING = [
  {
    group: "Currently",
    books: [
      { title: "The Rings of Saturn", author: "W.G. Sebald", note: "re-read" }
    ]
  }
];

const CONTACT = [
  { label: "email", value: "hi@janesmith.com", href: "mailto:hi@janesmith.com" },
  { label: "twitter", value: "@janesmith", href: "https://twitter.com/janesmith" }
];

Object.assign(window, { SITE, ESSAYS, PROJECTS, EXPERIENCE, NOW, READING, CONTACT });
```

The editor auto-detects the shape of each variable:

| Shape | Editor |
|---|---|
| Plain object | Field per key |
| Array of objects | List + detail panel |
| Array of strings | Textarea, one per line |
| Nested array of objects | Inline row editor |

---

## Adapting to your own schema

The default schema covers seven sections: `SITE`, `ESSAYS`, `PROJECTS`, `EXPERIENCE`, `NOW`, `READING`, `CONTACT`. To use a different structure:

**In `server.js`:** Update `parseContent()` to destructure your variable names, and update `serializeContent()` to write them back. Both are short, clearly labeled functions.

**In `index.html`:** Add or replace section editor components. Each editor is a self-contained React component, 30 to 50 lines. The `navItems` array in `App()` controls what appears in the sidebar.

The format itself is flexible. Any file that follows `const FOO = <value>` and ends with `Object.assign(window, {...})` will work.

---

## Hosted version

If you want to use repocraft without running anything locally, there is a hosted version at [repocraft-web.vercel.app](https://repocraft-web.vercel.app). Sign in with GitHub, add your repo, and edit from any browser.

---

## Contributing

Issues and PRs welcome. `server.js` is under 175 lines. `index.html` is under 650. You can read the whole codebase in a few minutes.

Open an issue first if you are planning something big, so we can align on the approach before you write code.

---

## License

MIT. See [LICENSE](LICENSE).
