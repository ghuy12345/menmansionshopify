# ISSUES.md — known traps, dead code, and latent bugs

> Findings from mapping the theme (see [`Map.md`](Map.md)). **Descriptive only — nothing here has been fixed.**
> Each entry states confidence: **Verified** (checked against the tree this session) or **Observed** (read from code, not runtime-tested).

---

## Latent bugs

### 1. `background-2` colour scheme is white-on-white — **Verified**

`config/settings_data.json` → `current.color_schemes.background-2`:

```
background: #fafaf8
text:       #fafaf8
```

Any section assigned this scheme renders invisible body text. The scheme *is* selectable in the theme editor.

The UUID scheme `scheme-ef8fee68-327f-4c37-828e-47991002c81e` has the same class of problem on its button: `button: #fafafa`, `button_label: #fafafa`.

**Why it matters:** silent — nothing errors, the text is just gone. Someone will eventually debug this as a CSS problem when it's a settings value.

---

### 2. Two session recorders run concurrently — **Verified**

- **Microsoft Clarity** — app embed, `config/settings_data.json` → `current.blocks`, enabled
- **SiteBehaviour** — *not* an app embed. Hardcoded directly into the theme at `layout/theme.liquid:302-314`:

```js
var sbSiteSecret = '05e9a010-444d-41c3-beab-af66dddf9d33';
window.sitebehaviourTrackingSecret = sbSiteSecret;
scriptElement.src = 'https://sitebehaviour-cdn.fra1.cdn.digitaloceanspaces.com/index.min.js?sitebehaviour-secret=' + sbSiteSecret;
```

Loaded async from a DigitalOcean Spaces CDN, with the site secret inline in page source. **Duplicated across all 5 theme layouts.**

**Why it matters:** two recorders is double the client-side cost on a CRO staging theme where measurement fidelity is the point. Because SiteBehaviour is not an app embed, it cannot be toggled from the Shopify admin — removing it needs a code change in 5 files. Also worth confirming both are covered by the site's consent banner (`ss-cookie-banner`), given a German/EU audience.

---

## Dead code and unused assets

### 3. Eight ingredient PNGs are completely unreferenced — 2.3 MB — **Verified**

`assets/mm-ing4-{bergamotte,bienenwachs,cetylalkohol,schwarzkuemmel,squalan,tallow,traubenkernoel,zedernholz}.png`

Zero references across `templates/`, `sections/`, `snippets/`, `layout/`, `config/`, and all CSS/JS in `assets/`. Grep for `ing4` and for individual ingredient names both return nothing.

Sizes range 199–479 KB each. They were presumably built for `mm-pdp-ingredients-grid.css` (the section that replaced `ss-product-ingredients-6`) and then either never wired up or superseded by CDN-hosted images.

**Why it matters:** 2.3 MB of theme weight against Shopify's asset limits, for files nothing renders.

---

### 4. Five orphaned GemPages sections — ~4,600 lines — **Verified**

`sections/gp-section-605572846948909654.liquid` (2,928 ln) · `-605572846949040726` (492) · `-605572846949237334` (106) · `-605572846949302870` (114) · `-605572846949368406` (947)

Each confirmed at **0 template references**:

```bash
for id in 605572846948909654 605572846949040726 605572846949237334 \
          605572846949302870 605572846949368406; do
  echo "$id -> $(grep -rl "gp-section-$id" templates/ | wc -l) templates"
done
```

**Why it matters:** mostly noise cost — they inflate `sections/` and every grep across it. `-605572846948909654` alone is the second-largest section file in the theme.

> Caveat before deleting: GemPages may reference sections from its own app database rather than from template JSON. Confirm in the GemPages admin first.

---

### 5. `mm-header.css` and `mm-announcement-stars.js` never load — **Verified**

`sections/header-group.json` → `mm_header_assets` is `"disabled": true`. So is `custom_liquid_yeLhHi` (the Essential Announcer mount div) and the stock `announcement-bar`. Only the `header` section is active.

**Why it matters:** someone will edit `assets/mm-header.css` and see no change on the storefront. The header polish work (spec: *Header.md*) is written but switched off. `mm-announcement-stars.js` swaps emoji stars for SVG in the announcement bar — a bar that is itself disabled.

---

## Maintenance traps

### 6. The default `product.json` / `collection.json` are legacy — **Verified**

`templates/product.json` has **zero** `mm_*` sections. It is the old generation, still wired to AliReviews. Every CRO'd PDP is an *alternate* template (`product.tallow.main.json`, `product.clearskinsetnew.json`, …). Same split on `collection.json`.

**Why it matters:** "edit the product template" is ambiguous here, and the obvious file is the wrong one. Confirm which template a product is actually assigned to before editing.

---

### 7. Shared blocks are byte-identical across 15 templates — **Verified**

`mm_pdp_comparison_section` (5,262 chars) and `mm_pdp_sticky_cta_section` (2,693 chars) are duplicated verbatim into every CRO PDP template. So is the `rich-text` block keyed `45f77b37-82dc-4dcd-aab6-662315b32360`.

**Why it matters:** there is no shared source. A copy change means 15 identical edits, and drift between them is invisible until someone diffs.

---

### 8. `theme.liquid` has four forks that must stay in sync — **Verified**

`theme.gempages.header.liquid`, `theme.gempages.footer.liquid`, `theme.gempages.blank.liquid`, `theme.gem-layout-none.liquid` are near-identical copies of `layout/theme.liquid`.

**Why it matters:** any `<head>` change — a tracking script, an asset link, a meta tag — silently applies to only the default layout unless mirrored into all four. `theme.gem-layout-none.liquid` additionally carries *"You SHOULD NOT modify source code in this file"*, so GemPages may regenerate it.

---

### 9. Seasonal promo hardcoded in the mobile drawer — **Verified**

`snippets/header-drawer.liquid:50-59` contains a fixed German promo tile: *"Sommeraktion / 2 Gratis-Produkte im Sommer-Special"*, linked to a collection.

**Why it matters:** it is not a theme setting or a section block, so rotating or removing a seasonal offer requires a code deploy. On a staging theme dated August, a summer promo is plausibly already stale.

---

### 10. Documented staging ↔ live divergence on `--mm-gold-soft` — **Observed**

From the header comment in `assets/mm-design-system.css`:

> *"gold-soft ist der hellere Akzent (#C6B074), nicht identisch mit --mm-gold. Auf staging stand hier faelschlich #AF9841 — das widersprach der eigenen gold-line rgba(198,176,116) und den lokalen Defs in mm-home-magazin.css und mm-home-vip.css. Live ist #C6B074 korrekt."*

The file in this export now reads `#C6B074`, i.e. the corrected value. The comment records that staging had drifted.

**Why it matters:** confirms staging and live have diverged on design tokens before, and that some `mm-*.css` files carry their own local colour definitions that can contradict the token layer.

---

### 11. German copy is not in `locales/` — **Verified**

All 57 locale files are stock Refresh translations. `de.json` is the *smallest* storefront file (17.8 KB) despite German being the shop language.

**Why it matters:** searching `locales/de.json` for customer-facing text finds nothing. All German copy is hardcoded in `templates/*.json` `custom_liquid` strings and in `sections/`. There is no translation workflow for the custom layer.

---

## Performance

### 12. `ss-counter.liquid` loads a render-blocking third-party stylesheet — **Observed**

Pulls CSS from `unpkg.com/@pqina/flip` — an uncontrolled external origin in the critical path. Used on `password.json`.

### 13. Largest assets — **Verified**

| Asset | Size | Note |
|---|---|---|
| `sicherheitsbericht-tallow-2026-07.pdf` | 1.17 MB | largest file in the theme; linked from 6 product templates |
| `mm-ing4-*.png` (8 files) | 2.3 MB total | see #3 — unreferenced |
| `base.css` | 81 KB | stock Dawn |
| `gp-global.css` | 70 KB | GemPages Tailwind build |
| `mm-design-system.css` | 62 KB | loaded globally on every page |
| `mm-pdp-clearskinset.css` | 48 KB | loaded on 15 PDPs + homepage |
| `SaolStandard-Semibold.otf` | 77 KB | **`.otf`, not woff2** — unoptimized for web |
| `sparkle.gif` | 179 KB | referenced from `base.css` |

### 14. Type is loaded twice over — **Observed**

Theme settings request Playfair Display + Inter from Shopify's font CDN; `mm-design-system.css` and GemPages sections request Saol Standard + Suisse Intl from `assets/`. Both sets ship on pages that use the `mm-*` layer.

---

## Not investigated

These were noticed but not chased down — flagging so they aren't mistaken for cleared:

- Whether the disabled sections (#5) are deliberately parked or accidentally switched off.
- Whether `product.tallow-old.json` and `index.gem-*` snapshots are still assigned to live products/pages, or are dead template files.
- Whether the two quiz pages (`page.quiz-4840.json`, `page.quiz-5528.json`) are both in use — they are duplicates.
- Runtime behaviour of any of it. Nothing here was tested against a live preview.
