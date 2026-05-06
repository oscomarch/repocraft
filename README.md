# repocraft

**A local CMS for your `content.jsx` file. Edit in a clean UI. Save to commit directly to GitHub.**

[![npm version](https://img.shields.io/npm/v/repocraft?style=flat-square)](https://www.npmjs.com/package/repocraft)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/yourname/repocraft?style=flat-square)](https://github.com/yourname/repocraft/stargazers)

No database. No CMS account. No build step to edit text. Run one Node.js server locally, open a browser tab, make your changes, and hit save. Your edits land as a real git commit and trigger a redeploy.

It reads a `content.jsx` from your GitHub repo via a personal access token, presents a structured editor for each section of your site, and writes the updated file back to GitHub on every save. That's it.

---

<!-- Add a screenshot here: screenshot of the editor open in a browser, showing the sidebar nav and an essay being edited -->

---

## Quick start

**1. Clone repocraft somewhere on your machine:**

```bash
git clone https://github.com/yourname/repocraft.git ~/repocraft
cd ~/repocraft
```

**2. Create a `.env` file:**

```bash
cp .env.example .env   # or just create it from scratch
```

**3. Fill in your `.env`:**

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=yourname/your-site-repo
CONTENT_PATH=content.jsx
GITHUB_BRANCH=main
```

**4. Run the server:**

```bash
node server.js
```

**5. Open the editor:**

```
http://localhost:3747
```

Make changes, hit **Commit to GitHub** (or `Cmd+S`), and your site redeploys.

---

## Getting a GitHub token

Go to [github.com/settings/tokens](https://github.com/settings/tokens) and create a classic token with the **repo** scope. Paste it into `.env` as `GITHUB_TOKEN`.

---

## How it works

- `server.js` starts an HTTP server on port 3747 (zero dependencies, pure Node.js)
- On load, it fetches `content.jsx` from GitHub via the Contents API and parses the exported variables
- `index.html` is a single-file React app (loaded from unpkg, no bundler) that renders a section editor for each variable
- On save, the server serializes your edits back into valid JS, base64-encodes it, and commits it via a GitHub API `PUT` request using the file's current SHA
- The SHA is tracked between saves so concurrent edits don't silently clobber each other

No npm install. No webpack. No database. The whole thing is two files.

---

## The content.jsx format

Your `content.jsx` is plain JavaScript: a set of `const` declarations that get assigned to `window` at the bottom so the browser can read them directly.

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
    href: "https://github.com/yourname/repocraft",
    tags: "open source · node"
  }
];

const EXPERIENCE = [
  {
    role: "Lead Designer",
    where: "Acme Corp",
    when: "2021 – present",
    desc: "Led product design across mobile and web."
  }
];

const NOW = {
  updated: "May 2025",
  blocks: [
    {
      heading: "Working on",
      items: ["Repocraft", "A ceramics project"]
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

The editor knows about all seven of these sections: `SITE`, `ESSAYS`, `PROJECTS`, `EXPERIENCE`, `NOW`, `READING`, and `CONTACT`. Each one maps to a dedicated section in the sidebar.

---

## Adapting it to your schema

The default schema is built for a personal site with essays, projects, and a now page. To adapt it:

1. **`server.js`**: Update `parseContent()` to destructure your own variable names, and update `serializeContent()` to write them back out. Both functions are clearly labeled and short.

2. **`index.html`**: Add or replace section editor components. Each editor is a self-contained React component, roughly 30-50 lines. The `navItems` array at the bottom of `App()` controls what appears in the sidebar.

The file format itself is flexible as long as it follows the pattern: `const FOO = <JSON-serializable value>` and ends with an `Object.assign(window, {...})` call.

---

## The full web version

If you want to host repocraft as a shared web app (so a team or client can edit content without running anything locally), see [repocraft-web](https://github.com/yourname/repocraft-web). It's the same core logic deployed as a web service with authentication.

---

## Contributing

Issues and PRs are welcome. The codebase is small: `server.js` is under 175 lines, `index.html` is under 635. If you want to add a new section type or improve the editor UI, you can read the whole thing in a few minutes.

Open an issue first if you're planning something big, so we can talk through the approach before you write code.

---

## License

MIT. See [LICENSE](LICENSE).
