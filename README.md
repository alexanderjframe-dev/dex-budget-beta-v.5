# Dex Budget — Ambient Studio Beta v1.5

A calm, adaptive budgeting beta for regular and variable-income users. v1.5 introduces a more realistic-looking live background engine and a small customization studio **without changing the financial calculation engine**.

## What changed in v1.5

- Reworked bubbles with independent motion, different apparent depths, asymmetrical reflections, iridescent edges, and transparent centers. This is *stylized computer graphics*, not physically exact fluid simulation or a video.
- New **Fireflies** and **Rain on Glass** backgrounds alongside Original, Bubbles, Aurora, Ocean, Starlight, and two graffiti wallpapers.
- **Atmosphere intensity**: Subtle, Balanced, Immersive.
- **Motion speed**: Slow drift, Natural, Lively.
- **Full-screen preview** so you can experience the motion without cards covering it.
- **Quiet while entering amounts** reduces visual intensity when input/select controls have focus (on by default).
- Retains original mint/navy as the default; existing color presets and background-matching suggestions still work.
- Motion stops in background tabs, respects system Reduce Motion, and caps rendering frame rate/resolution for better mobile battery life.

## Updating your GitHub Pages app

**Backup your data first:** Dex Budget → History → Data & backup → Export backup.

The project is static. GitHub Pages settings are `Deploy from a branch / main / (root)` and `.nojekyll` ensures the raw files are published rather than transformed by Jekyll. If publishing manually, upload the contents of this folder to the repository root (not the enclosing folder or ZIP). Keep all files together.

If you're using the existing v.5 repository at `https://alexanderjframe-dev.github.io/dex-budget-beta-v.5/`, opening the same URL after deployment preserves your *browser's* existing Dex data. Data doesn't automatically transfer to a new browser, device, or GitHub Pages URL. A service worker may require closing and reopening the home-screen app once or twice after a new release. **Don't clear Safari website data to refresh** unless you have a backup.

## How to test

1. More → Appearance → Bubbles · realistic. Use **Explore full-screen preview** and watch the spheres rise at different speeds.
2. Select **Immersive** and **Lively**, then return to **Subtle** and **Slow drift**.
3. Switch to Fireflies and Rain on Glass. Try the recommended matching palette.
4. Check **Quiet background while entering amounts**: focus a money field and see the background fade.
5. Turn off live motion or enable iPhone's Reduce Motion setting. Animations should stop.
6. Check Bills, Add, Plan, and History. Financial records should still behave exactly as in v1.4. Export a backup for good measure.

## Privacy and financial limitations

The animation canvas draws decorations only and does not read any income, transaction, or account data. Dex stores its finance ledger locally in the same `dex_budget_guided_beta_v1` browser storage key used previously, with backward-compatible appearance fields.

Dex Budget remains **an early calculation prototype**, not a bank-connected finance service. Suggested allocations do not move money. Safe-to-spend is an estimate, not a verified bank balance or a promise that all future bills are covered; bills are only advanced when marked paid in the app. Tax reserves are configurable estimates. Export backups regularly.

## Files

`index.html` app UI and styles; `app.js` financial logic and customization settings; `motion.js` decorative Canvas ambient engine; `sw.js` offline cache; `manifest.webmanifest` app manifest; icons; two original graffiti PNGs; `.nojekyll` GitHub Pages static configuration; and this README.
