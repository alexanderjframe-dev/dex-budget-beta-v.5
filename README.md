# Dex Budget — Guided Beta v1.3

A private, offline-capable mobile web app with guided budget recommendations, a dedicated Bills tab, and optional appearance customization. Deployable to GitHub Pages at no cost.

## Upload to GitHub Pages

1. **Before updating**, open your installed Dex Budget app and choose **History → Data & backup → Export backup**. Save the JSON somewhere you can find it.
2. Extract the ZIP on your computer.
3. In your existing GitHub repository, choose **Add file → Upload files**.
4. Upload the **11 files inside** the extracted folder (including both `wallpaper-*.png` images); don't upload just the ZIP or the folder itself.
5. Commit the changes to the branch used by GitHub Pages (usually `main`).
6. Confirm **Settings → Pages** is set to **Deploy from a branch → main → / (root)**.
7. Reopen your existing Pages link. If it still looks old, fully close and reopen the app or refresh Safari. The version label should show **GUIDED BETA v1.3**.

If you set up a different GitHub repository or domain, browser storage **does not migrate automatically**. Export a JSON backup from the old site, import it at **History → Data & backup** on the new site.

## New in v1.3

- **Bills is its own tab**: Upcoming, Paid history, Add / Edit.
- Funding bars show how much is protected for each bill and how much is still unfunded.
- Due dates and repeating schedules: one-time, weekly, biweekly, monthly, yearly.
- **Mark paid** is an explicit action. It records exactly one expense in Dex, uses the bill's previously protected allocation, and advances the next due date *once* for repeating bills. Don't also record the same payment under Add.
- Previously saved bills default to **One time** until edited. This avoids silently assuming a recurrence for existing data.
- **More → Appearance**: Original navy / mint theme, animated Aurora / Ocean / Starlight backgrounds, 2 original graffiti PNG wallpapers, 5 palette presets, custom accent, recommended color matches, automatic matching toggle, animation toggle, reset.
- Respects system **Reduce Motion**; backgrounds never cover the cards or reduce their text contrast.
- Financial data is retained in the old localStorage key (`dex_budget_guided_beta_v1`), with an optional backward-compatible `appearance` field. Exported JSON includes appearance settings.

## Important beta boundaries

- This is a budgeting prototype, **not a bank-connected app**. It doesn't transfer, withdraw, or protect real money.
- The safe-to-spend figure is a **planning estimate**, not a verified bank balance. It may not cover all future obligations beyond its planning window.
- Recording a bill payment under Add does **not** automatically mark that bill paid. Use **Bills → Mark paid** for a payment you actually made.
- If you delete a bill payment from History later, the recurring bill's due date is **not** automatically reversed; edit the bill date yourself.
- Existing bills do not become recurring automatically: use **Edit** to choose the payment frequency.
- Bills only roll forward when you explicitly mark them paid; overdue bills remain until you update them.
- Tax reserves are configurable estimates and are not formal tax calculations.
- Data is stored on the device (localStorage). Clearing site data may remove it. Back up regularly.
- Wallpapers are local files, not downloaded from Apple, and the animated options are original CSS effects.

## Files

- `index.html` — responsive interface
- `app.js` — calculations, recurring bills, data, appearance, guided recommendations
- `sw.js` — offline caching with v1.3 cache bump
- `manifest.webmanifest` — iPhone app manifest
- `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — icons
- `wallpaper-neon-tag.png`, `wallpaper-ink-tag.png` — original PNG graffiti backgrounds
- `README.md` — these instructions

## Smoke test

1. Open Bills, add a $40 monthly bill with a due date.
2. Confirm it appears in Upcoming, then tap Mark paid **only if it was actually paid**. The payment should appear in Paid history, and the next month's due date should display.
3. Open More → Appearance, try Aurora, then select the Ice Blue scheme; switch to the graffiti wallpaper and apply the recommended palette.
4. Refresh and verify the selections persist.
5. Export backup and verify it is a JSON file before making bigger changes.
