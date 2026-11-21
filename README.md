# mjsimone.com

Personal portfolio site for Matt Simone: software engineering projects, background, and contact links.

**Live:** https://www.mjsimone.com

## Stack

Plain HTML and CSS, no build step. Hosted on GitHub Pages with a custom domain (`CNAME`).

## Structure

| File         | Purpose                          |
| ------------ | -------------------------------- |
| `index.html` | The whole page                   |
| `style.css`  | Styles (colors set as variables in `:root`) |
| `CNAME`      | Custom domain for GitHub Pages   |

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Push to `main`. GitHub Pages publishes it automatically.
