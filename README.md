# Deadlock Patch Meta Heatmap

Visual MVP to compare hero impact across patches.

## Run locally

Use any static server from repo root, e.g.:

```bash
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

## Hero images

Add portrait files in `data/hero-images/` (see `data/hero-images/README.md`).
Missing portraits automatically fall back to `placeholder.svg`.

## Importing patches

1. Add markdown files under `data/patches/`.
2. Update `data/patches/index.json`.
3. Format per hero section:

```md
## Hero: Warden
- Base damage increased from 50 to 54
- Grapple cooldown increased from 14s to 16s
```

## Deploy (GitHub Pages)

This repo includes a GitHub Actions workflow to deploy static files from `main` to GitHub Pages.
