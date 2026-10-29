# Launch kit

Everything needed to launch Velo PDF. Work through it top to bottom.

## Before launch (one-time, ~30 minutes, needs your GitHub/Netlify accounts)

- [ ] **Social preview:** GitHub repo → Settings → General → Social preview → upload `docs/social-preview.png`.
- [ ] **Topics, website, description:** repo → ⚙️ next to "About". Topics are listed in the main conversation
      and below; website: the Netlify URL (or your custom domain).
- [ ] **Starter issues:** `gh auth login` as `adirel`, then `bash docs/launch/create-issues.sh`.
- [ ] **Release:** GitHub → Releases → the `v1.0.0` tag → "Create release from tag", paste the 1.0.0 section of `CHANGELOG.md`,
      attach nothing. (Or: `gh release create v1.0.0 --notes-file docs/launch/release-notes.md`.)
- [ ] **Custom domain (recommended):** e.g. `velopdf.app`. Netlify → Domain management → Add domain.
      Then update the URLs in README, `index.html` and these docs.
- [ ] **Discussions:** repo Settings → Features → enable Discussions (a place for feedback that isn't an issue).
- [ ] **Pin the repo** on your GitHub profile.

Topics: `pdf-viewer pdf-reader pdf pdfjs pdf-js pwa progressive-web-app offline-first typescript vite netlify
service-worker workbox file-handling-api large-files performance virtualization windows web-app document-viewer`

## Launch week (one channel per day)

| Day | Channel | File |
|---|---|---|
| 1 (Tue–Thu) | Show HN | `show-hn.md` |
| 1, same day | Technical article on dev.to (+ cross-post to Hashnode/Medium) | `article.md` |
| 2 | r/javascript, then r/webdev the next morning | `reddit-and-social.md` |
| 3 | X thread + LinkedIn | `reddit-and-social.md` |
| 4 | r/PWA, r/sideproject, r/opensource | `reddit-and-social.md` |
| 5 | Israeli dev communities (Hebrew post) | `reddit-and-social.md` |
| Following week | Product Hunt | `product-hunt.md` |
| Ongoing | Awesome lists, PWA galleries, Microsoft Store (PWABuilder), AlternativeTo | `awesome-lists.md` |

## Rules of thumb

- Answer every comment and issue fast during launch week; it's what turns visitors into stargazers.
- Ship a visible improvement right after launch (e.g. thumbnails) and post a short "v1.1" update.
- Never buy stars or join "star for star" groups; GitHub removes them and it hurts credibility.
- Keep the benchmark numbers honest: re-run `npm run benchmark` and update the README when they change.
