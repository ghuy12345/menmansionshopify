# Map.md — MenMansion Shopify Theme

> Reference map of this workspace. Read §2 before searching for anything.
> Companion doc: [`ISSUES.md`](ISSUES.md) — known traps, dead code, latent bugs.

---

## 1. What this is

A **Shopify theme export**, not an application repo.

| | |
|---|---|
| Export | `theme_export__menmansion-com-menmansion-cro-ops-staging__21AUG2026-0230pm` |
| Store | menmansion.com — German-language men's skincare |
| Environment | **CRO ops staging** |
| Base theme | **Shopify Refresh 15.2.0** (Dawn family, free, author: Shopify) |
| Storefront language | German. Code comments are German too. |
| Git history | Single commit `10ed756`. **No baseline to diff stock Dawn against.** |

| Directory | Files | Lines (liquid) |
|---|---|---|
| `assets/` | 234 | — |
| `sections/` | 136 | ~109,700 |
| `templates/` | 72 | — |
| `locales/` | 57 | — |
| `snippets/` | 47 | ~15,700 |
| `layout/` | 6 | ~2,060 |
| `config/` | 2 | — |

---

## 2. Read this first

### Rule 1 — `mm-` means in-house

`mm-*` is the MenMansion namespace. Anything `mm-` prefixed is CRO work written for this store. Everything else is stock Refresh or vendor-generated.

### Rule 2 — the custom work is NOT in `sections/`

This is the single biggest time-sink in this repo. **Custom section markup lives inline inside the template JSON**, in `sections.<key>.settings.custom_liquid`. CSS and JS are extracted to `assets/mm-*.css|js` and pulled in from that inline Liquid via `asset_url`.

```
126 custom-liquid sections across 42 templates.
Only ONE bespoke section file exists:  sections/mm-pdp-related.liquid
Only ONE bespoke snippet:              snippets/mm-rating.liquid
```

Grepping `sections/` for `mm_pdp_faq` or `mm_home_hero` returns **nothing**. The HTML is in `templates/product.*.json` and `templates/index.json`.

**Finding a feature — the working recipe:**

```bash
# 1. Which template renders it? (grep the JSON, not the sections)
grep -rl "Vom Bio-Hof" templates/

# 2. Which custom_liquid block, and what assets does it load?
python3 - <<'PY'
import json,re
d = json.loads(re.sub(r'/\*.*?\*/','',open('templates/product.tallow.main.json').read(),flags=re.S))
for k in d['order']:
    s = d['sections'][k]
    if s['type']=='custom-liquid':
        cl = s['settings']['custom_liquid']
        print(k, len(cl), sorted(set(re.findall(r"'(mm-[a-z0-9._-]+)'", cl))))
PY

# 3. Then open the asset it names.
```

> ⚠️ Template JSON starts with a `/* … */` comment preamble that Shopify allows but `json.load` rejects. Strip it first — every snippet in this doc does.

### Rule 3 — `sections/` is ~82% vendor noise

Four origins, each identifiable by prefix:

| Prefix | Count | Origin | Identifying marker | Hand-edit? |
|---|---|---|---|---|
| `gp-section-*` | 61 | **GemPages** page builder | `.gps-<id>` CSS namespace; one minified `<style>` line thousands of chars wide | ❌ machine-generated |
| `ss-*`, `blog-1` | 16 | **Section Store** (sectionstore.app) | `Copyright © 2025 Section Store` header | ⚠️ vendor |
| `st_*` | 2 | **Sternify** | `Copyright © 2024 Sternify` header | ⚠️ vendor |
| `mm-*` | 1 | **In-house** | German comments, no vendor header | ✅ yours |
| (none) | ~56 | Stock Refresh | matches Dawn upstream | ⚠️ upstream |

---

## 3. Directory map

| Dir | What's in it | Worth reading? |
|---|---|---|
| `templates/` | **Start here.** 71 `.json` + `gift_card.liquid`. Carries all CRO markup inline. | ✅ the source of truth |
| `assets/mm-*` | The custom CSS/JS layer (19 CSS, 13 JS, 12 PNG). Each CSS names its spec doc in the header. | ✅ high value |
| `assets/` (rest) | Stock Dawn CSS/JS + `gp-global.css` (GemPages Tailwind build) | ⚠️ vendor |
| `sections/` | 1 bespoke file, 79 vendor, ~56 stock | ❌ mostly skip |
| `snippets/` | 2 customized (`mm-rating`, `header-drawer`), 8 GemPages partials, rest stock | ⚠️ selective |
| `layout/` | 5 near-identical forks + `password.liquid` | ✅ small, read it |
| `config/` | `settings_schema.json` (100% stock), `settings_data.json` (**app embeds live here**) | ✅ read settings_data |
| `locales/` | 57 stock translation files. **No custom copy lives here.** | ❌ skip |

---

## 4. Template → section map

Every template below is non-GemPages. The 6 `page.gp-template-*.json` files are covered in §8.

### 4.1 Two coexisting generations

| Generation | Templates | Marker |
|---|---|---|
| **Current (CRO)** | `index.json`, all `product.<name>.json`, `collection.bundles/hygiene/supplements`, `page.unsere-mission` | `mm_*` custom-liquid sections |
| **Legacy** | `product.json`, `collection.json`, all `*.gem-*`, all `*.gp-template-*` | AliReviews app blocks, Dawn sections |

> ⚠️ **`templates/product.json` and `templates/collection.json` — the DEFAULTS — are legacy.** All CRO'd pages are *alternate* templates. It is very easy to edit the wrong one.

**Byte-identical duplicate groups** (treat each group as one file):
- `index.json` == `index.gp-template-bk-default.json`
- `index.gem-1769100387-template.json` == `index.gem-backup-default.json`
- `collection.json` == `collection.gp-template-bk-default.json`
- `collection.gem-1769100391` == `collection.gem-1770253827` == `collection.gem-backup-default`
- `product.gem-1769100389` == `product.gem-1770253824` == `product.gem-backup-default`

### 4.2 Homepage — `templates/index.json`

| # | Section key | Type | Assets loaded |
|---|---|---|---|
| 1 | `mm_home_hero_section` | custom-liquid (2.0k) | `mm-home-hero.css`, `mm-home-hero.js` |
| 2 | `mm_home_bestseller_section` | custom-liquid (8.1k) | `mm-home-bestseller.css/.js`, `mm-rating` |
| 3 | `mm_home_bundles_section` | custom-liquid (8.6k) | `mm-home-bestseller.css/.js`, `mm-rating` |
| 4 | `mm_home_tallow_section` | custom-liquid (2.1k) | `mm-home-tallow.css/.js` |
| 5 | `ss_testimonials_21_AbHfRN` | ss-testimonials-21 | **[DISABLED]** |
| 6 | `mm_home_compare_section` | custom-liquid (5.4k) | `mm-pdp-clearskinset.css`, `mm-tallow-tiegel.png`, `mm-andere-tiegel.png` |
| 7 | `ss_scrolling_announcement_bar_WpAdrF` | ss-scrolling-announcement-bar | |
| 8 | `mm_home_why_section` | custom-liquid (0.6k) | |
| 9 | `mm_home_voices_section` | custom-liquid (**14.6k — largest**) | `mm-pdp-testimonials.css`, `mm-pdp-clearskinset.css` |
| 10 | `mm_home_magazin_section` | custom-liquid (1.4k) | `mm-home-magazin.css` |
| 11 | `custom_liquid_UkgdHq` | custom-liquid (0.7k) | `mm-home-vip.css/.js` |
| 12 | `ss_cookie_banner_mQniWU` | ss-cookie-banner | |

**Homepage alternates:**
- `index.gem-1787037996-template.json` — same 12 sections, shorter `mm_home_voices` (13.4k). Older snapshot.
- `index.gem-1769100387` / `-1770253822` / `-backup-default` — legacy 16-section Dawn homepage: `image-banner → rich-text → rich-text → featured-collection → rich-text → featured-collection → rich-text → image-with-text → ss-testimonials-21 → ss-comparison-table-6 → ss-scrolling-announcement-bar → rich-text → multicolumn → blog-1 → custom-liquid → ss-cookie-banner`
- `index.gem-1782494086-template.json` — legacy 16 with `ss-testimonials-21` disabled and `ss-blog-slider` in place of `blog-1`.

### 4.3 Product pages

**The standard PDP recipe** — learn this once, then read the deltas table:

```
main-product
  → mm_pdp_deepdives          custom-liquid
  → mm_pdp_herkunft           custom-liquid
  → mm_pdp_ingredients        custom-liquid
  → mm_pdp_routine            custom-liquid   [mm-pdp-routine3.css]
  → mm_pdp_comparison         custom-liquid   [mm-tallow-tiegel.png, mm-andere-tiegel.png]
  → mm_pdp_reviews_header     custom-liquid
  → mm_pdp_faq                custom-liquid
  → apps                      Loox reviews
  → rich-text                 45f77b37-…  (shared across every CRO PDP)
  → mm-pdp-related            sections/mm-pdp-related.liquid
  → mm_pdp_sticky_cta         custom-liquid   [mm-pdp-sticky-cta.css]
```

`mm_pdp_comparison` (5262 chars) and `mm_pdp_sticky_cta` (2693 chars) are **byte-identical across all 15 CRO PDPs** — change one, change all.

| Template | Delta from the recipe |
|---|---|
| `product.tallow.main.json` **(flagship, 14)** | + `mm_pdp_ba`, + `mm_pdp_testimonials`, + `mm_pdp_studie`; herkunft is the long 4.9k variant `[mm-pdp-herkunft2.css]`; ingredients 4.2k `[mm-pdp-ingredients-grid.css]`; routine 4.2k `[+mm-r3-aleppo.png, mm-tallow-tiegel.png]`; **no deepdives** |
| `product.tallow-old.json` | Prior revision of the above. Same 14 sections, shorter copy blocks. |
| `product.clearskinsetnew.json` **(15, most complex)** | + `mm_pdp_studie`; + `ss-before-after-5` **[DISABLED]**, `ss-testimonial-12` **[DISABLED]**, `collapsible-content` **[DISABLED]**; ingredients moved after comparison; **no herkunft, no faq** |
| `product.alepposoap.json` (12) | exact recipe |
| `product.bartserum.json` (11) | recipe **minus the Loox apps section** |
| `product.bartset.json` (11) | same as bartserum (shares the 4281-char ingredients block) |
| `product.eisroller.json` (10) | recipe minus ingredients, minus Loox |
| `product.gua-sha.json` (10) | same as eisroller |
| `product.jawline-gum.json` (10) | + `mm_pdp_ba`; **no routine, no ingredients**, no Loox |
| `product.arcticskinset.json` (11) | + `mm_pdp_studie`; **no herkunft, no ingredients, no faq**; 2× apps sections |
| `product.bundle_template.json` (11) | same shape as arcticskinset. Longest `deepdives` (3.3k) + `routine` (4.4k). |
| `product.skin-hairduo.json` (11) | same as arcticskinset |
| `product.skinbeardset.json` (11) | same as arcticskinset |
| `product.talloweisrollerspray.json` (11) | same as arcticskinset |
| `product.texture-spray.json` **(8, shortest)** | **Unique**: `mm_pdp_principle` (5.6k) + `mm_pdp_why_mm` (5.4k) replace deepdives/herkunft/ingredients/routine/comparison |

**Legacy product templates** — `product.json`, `product.gp-template-bk-default.json`, `product.gem-1787037998`, `-1782494088`, `-1769100389`, `-1770253824`, `-backup-default`. All 8 sections, identical shape:
`main-product → ss-tabs-block → ss-payment-icons → apps(AliReviews) → apps(zegsu-alireviews) → apps → rich-text → related-products`

**`main-product` buy-box block families** (three distinct shapes):

| Family | Templates | Shape |
|---|---|---|
| Legacy / thin | all `gem`/`gp`/`product.json` | 9–10 blocks, no Loox rating |
| Set / bundle | arcticskinset, bundle_template, clearskinsetnew, skin-hairduo, skinbeardset, talloweisrollerspray | ~30–32 blocks. **No `variant_picker`, no `quantity_selector`.** + Section Store benefits/shipping/comments/pulse-badge, Sternify, Koala |
| Single product | alepposoap, bartserum, bartset, eisroller, gua-sha, jawline-gum, texture-spray, tallow* | includes `variant_picker` + `quantity_selector` |

`mm-pdp-clearskinset.js` (15 PDPs) and `mm-pdp-bundle-buybox.css/.js` (5 PDPs) are loaded from `custom_liquid` **blocks inside the `main` section**, not from a top-level section.

### 4.4 Collections

| Template | Order |
|---|---|
| `collection.json` **(default, legacy)** | `main-collection-banner` **[DISABLED]** → `product-grid` custom-liquid (2.7k) `[mm-home-bestseller.css/.js, mm-rating]` → apps(zegsu-alireviews-collection) |
| `collection.bundles.json` | banner **[DISABLED]** → `mm_collection_bundles_intro` (1.2k) `[mm-collection-bundles.css/.js]` → `product-grid` (5.4k) → `mm_collection_bundles_outro` (2.9k) → apps |
| `collection.hygiene.json` | banner **[DISABLED]** → `mm_collection_pflege_intro` (1.0k) `[mm-collection-pflege.css/.js]` → `product-grid` (5.3k) → `mm_collection_pflege_outro` (3.6k) → apps |
| `collection.supplements.json` | `image-banner` → banner **[DISABLED]** → `product-grid` custom-liquid → apps |
| `collection.accessoires-und-stil.json` | `image-banner` → banner **[DISABLED]** → **`main-collection-product-grid`** (real Dawn grid) → apps |
| `collection.gem-1787038000-template.json` | same 3 as default |
| `collection.gem-1782494090-template.json` | banner **[DISABLED]** → `main-collection-product-grid` → apps |
| `collection.gem-1769100391` / `-1770253827` / `-backup-default` | identical trio, same as above |

> The `product-grid` key is a **custom-liquid section, not the Dawn grid**, on every collection except `accessoires-und-stil` and the `gem-` legacy set.

### 4.5 Articles & blog

| Template | Order |
|---|---|
| `blog.json` | `main-blog` |
| `article.json` | `main-article → rich-text` |
| `article.hero-plus-text.json` | identical to `article.json` |
| `article.tallow.json` (10) | main-article **[DISABLED]** → image-banner → rich-text → **ss-before-after-5** → rich-text ×2 → image-with-text → rich-text ×3 |
| `article.bartset.json` (9) | as tallow, minus one rich-text |
| `article.natuerliche-hauptpflege.json` (8) | as bartset, minus the before/after |
| `article.glow-up-2025.json` (9) | main-article **[DISABLED]** → image-banner → rich-text → image-with-text ×5 → rich-text |
| `article.supplements.json` (9) | main-article **[DISABLED]** → image-banner → rich-text → image-with-text ×4 → rich-text → **multicolumn** |

> Pattern: every custom article template **disables `main-article`** and rebuilds the post from sections.

### 4.6 Pages, cart, and the rest

| Template | Order / note |
|---|---|
| `page.json` | `main-page` |
| `page.contact.json` | `main-page → contact-form` |
| `page.unsere-mission.json` | `main-page` **[DISABLED]** → `mm_mission_section` custom-liquid (5.7k) `[mm-page-mission.css]` |
| `page.quiz-4840.json` / `page.quiz-5528.json` | `apps` → Recomma Product Quiz. Duplicate pages. |
| `cart.json` | `rich-text (FrtVXi)` → `main-cart-items` → `main-cart-footer`. Note the banner **above** the cart. |
| `search.json` | `main-search` |
| `404.json` | `main-404` |
| `list-collections.json` | `main-list-collections` |
| `password.json` | `"layout": "password"` — rich-text → image-banner → custom-liquid → rich-text → ss-counter → ss-comparison-table-6 → ss-scrolling-announcement-bar → rich-text → multicolumn |
| `gift_card.liquid` | **The only `.liquid` template.** `{% layout none %}`, standalone HTML, QR via `vendor/qrcode.js` |

`templates/customers/` — 7 files, one `main` section each: `account`, `activate_account`, `addresses`, `login`, `order`, `register`, `reset_password`. All stock.

---

## 5. The `mm-*` custom layer

### 5.1 CSS (19 files)

Each header comment names the spec doc it was built from.

| File | Size | Purpose | Loaded from |
|---|---|---|---|
| `mm-design-system.css` | 61.8 KB | **Token source of truth.** See §6. | `layout/theme.liquid:261` (global) |
| `mm-pdp-clearskinset.css` | 47.9 KB | Clear Skin Set PDP redesign (buybox + gallery intro) | 21 refs — 15 PDP `main` blocks + homepage compare/voices |
| `mm-bundle-skin.css` | 13.4 KB | Re-skins the **Koala bundles widget** to match the old buybox. Presentation only — never moves the widget in the DOM (that breaks tier binding). | `sections/main-product.liquid:742` |
| `mm-home-bestseller.css` | 13.1 KB | Bestseller rail. *(spec: Bestseller-Section-Spec.md)* | 13 refs — homepage + every custom `product-grid` + `mm-pdp-related` |
| `mm-menu-drawer.css` | 12.2 KB | Mobile menu drawer rebuild. *(spec: Mobile-Menue-Spezifikation)* | `snippets/header-drawer.liquid:20` |
| `mm-home-hero.css` | 11.3 KB | Homepage hero "Sommer-Special" | `index.json#mm_home_hero_section` |
| `mm-collection-pflege.css` | 8.3 KB | Pflege collection: announcement, hero, trust, filter/sort, cross-sell, FAQ, sticky cart | `collection.hygiene.json` |
| `mm-collection-bundles.css` | 8.0 KB | Bundles collection, same block set. *(spec: Bundles-Sektion-Handoff.md)* Contains a documented specificity fix forcing `[hidden]` cards to hide. | `collection.bundles.json` |
| `mm-pdp-bundle-buybox.css` | 7.8 KB | Tallow bundle buybox. *(spec: Bundle-Buybox-Tallow.md)* | 5 PDP `main` blocks |
| `mm-pdp-herkunft2.css` | 7.3 KB | PDP "Vom Bio-Hof in deine Hand" origin section | `product.tallow.main`, `product.tallow-old` |
| `mm-home-vip.css` | 6.6 KB | Homepage VIP / newsletter block | `index.json#custom_liquid_UkgdHq` |
| `mm-pdp-routine3.css` | 6.5 KB | PDP 3-step routine | 13 PDPs |
| `mm-page-mission.css` | 6.2 KB | "Unsere Mission / Unsere Geschichte" page | `page.unsere-mission.json` |
| `mm-pdp-testimonials.css` | 6.1 KB | PDP "Das sagen unsere Gentleman" | homepage voices + 2 tallow PDPs |
| `mm-home-tallow.css` | 5.8 KB | Homepage Tallow section | `index.json#mm_home_tallow_section` |
| `mm-pdp-ingredients-grid.css` | 5.0 KB | PDP ingredients grid — **replaces app section `ss-product-ingredients-6`** | clearskinsetnew + 2 tallow PDPs |
| `mm-home-magazin.css` | 3.8 KB | Homepage magazine rail — **replaces `ss-blog-slider` (Swiper)** with pure CSS | `index.json#mm_home_magazin_section` |
| `mm-pdp-sticky-cta.css` | 2.2 KB | PDP sticky bar (`mm-sc-*`). **Not add-to-cart** — scrolls back to the buybox. | all 15 CRO PDPs |
| `mm-header.css` | 0.5 KB | Header polish. *(spec: Header.md)* | `sections/header-group.json#mm_header_assets` ⚠️ **DISABLED — never loads** |

### 5.2 JS (13 files)

All are self-guarded IIFEs using a `window.__mmXxxInit` re-entry flag.

| File | Size | Purpose | Loaded from |
|---|---|---|---|
| `mm-pdp-clearskinset.js` | 14.4 KB | Clear Skin Set PDP interactions. Explicitly does **not** touch `product-form.js` / `price-per-item.js`. | 15 PDP `main` blocks |
| `mm-bundle-skin.js` | 14.4 KB | Koala bundle boxes: builds the "Das bekommst Du" list. Presentation only. | `sections/main-product.liquid:752` |
| `mm-koala-gallery-sync.js` | 6.7 KB | Syncs Koala offer selection → PDP gallery | `sections/main-product.liquid:762` |
| `mm-koala-form-bridge.js` | 6.3 KB | Bridges the Koala widget ↔ product form; reconciles hidden inputs on tier click. Exists because the app places its widget outside the buybox. | `sections/main-product.liquid:760` |
| `mm-pdp-bundle-buybox.js` | 6.3 KB | Bundle buybox price formatting (`de-DE`, €) | 5 PDP `main` blocks |
| `mm-collection-bundles.js` | 3.6 KB | Bundles collection filter/sort/FAQ | `collection.bundles.json` |
| `mm-collection-pflege.js` | 3.6 KB | Pflege collection filter/sort | `collection.hygiene.json` |
| `mm-home-tallow.js` | 3.6 KB | Homepage Tallow section | `index.json` |
| `mm-announcement-stars.js` | 2.6 KB | Swaps emoji stars → SVG stars in the announcement bar (text comes from Essential Announcer) | `header-group.json#mm_header_assets` ⚠️ **DISABLED** |
| `mm-home-hero.js` | 1.4 KB | Measures header-group height for the transparent-header-over-hero effect | `index.json` |
| `mm-home-bestseller.js` | 1.1 KB | Bestseller rail | 12 refs |
| `mm-footer-widerruf.js` | 0.8 KB | Footer hook for the **EU Widerruf Pro** app button | `layout/theme.liquid:407` (global) |
| `mm-home-vip.js` | 0.6 KB | VIP / newsletter block | `index.json` |

### 5.3 PNG (12 files)

| File | Size | Used by |
|---|---|---|
| `mm-gift-spray.png` | 173 KB | `main-product.liquid` (Koala gift thumb map) |
| `mm-andere-tiegel.png` | 141 KB | 18 refs — every `mm_pdp_comparison` + homepage compare |
| `mm-r3-aleppo.png` | 123 KB | `main-product.liquid` + 2 tallow routine sections |
| `mm-tallow-tiegel.png` | 65 KB | 21 refs — comparisons, routine, gift thumb map |
| `mm-ing4-bienenwachs.png` | 479 KB | ⚠️ **unreferenced** |
| `mm-ing4-tallow.png` | 423 KB | ⚠️ **unreferenced** |
| `mm-ing4-zedernholz.png` | 331 KB | ⚠️ **unreferenced** |
| `mm-ing4-squalan.png` | 238 KB | ⚠️ **unreferenced** |
| `mm-ing4-cetylalkohol.png` | 226 KB | ⚠️ **unreferenced** |
| `mm-ing4-bergamotte.png` | 224 KB | ⚠️ **unreferenced** |
| `mm-ing4-traubenkernoel.png` | 202 KB | ⚠️ **unreferenced** |
| `mm-ing4-schwarzkuemmel.png` | 199 KB | ⚠️ **unreferenced** |

> The 8 `mm-ing4-*.png` (**2.3 MB**) have zero references anywhere in the theme. See `ISSUES.md`.

### 5.4 Bespoke Liquid (2 files)

| File | Lines | Purpose |
|---|---|---|
| `sections/mm-pdp-related.liquid` | 92 | Bespoke PDP related-products grid. Uses `mm-home-bestseller.css` + `mm-rating`. **Used by 15 templates** — the most-used bespoke file. |
| `snippets/mm-rating.liquid` | 45 | Star rating from Loox metafields (`product.metafields.loox.avg_rating` / `num_reviews`). German docblock. |

---

## 6. Design system — `assets/mm-design-system.css`

1413 lines / 61.8 KB. Loaded globally from `layout/theme.liquid:261`, immediately after `base.css`.

**Design intent, quoted from its own header:** dark-first, *"token-only + opt-in `.mm-*` Helper. KEINE globalen body/h/p-Overrides"* — so it deliberately does **not** restyle stock Refresh. Adoption is incremental, per section.

### Tokens

```css
/* Brand core */
--mm-onyx: #191919;  --mm-alabaster: #FAFAF8;  --mm-gold: #AF9841;
/* Depths & neutrals */
--mm-ink: #0E0E0E;  --mm-charcoal: #272725;  --mm-graphite: #33322F;
--mm-stone: #6E6B63;  --mm-sand: #EFEDE6;  --mm-line: #E2DFD6;
/* Gold steps */
--mm-gold-soft: #C6B074;  --mm-gold-deep: #8A7733;
--mm-gold-line: rgba(198,176,116,0.42);

/* Semantics — DARK is the default */
--mm-bg: onyx;  --mm-surface: charcoal;  --mm-fg: alabaster;
--mm-fg-muted: #A8A49A;  --mm-border: graphite;
/* Semantics — LIGHT is secondary */
--mm-bg-light: alabaster;  --mm-surface-light: #FFFFFF;
--mm-fg-on-light: onyx;  --mm-border-light: line;
```

| Group | Tokens |
|---|---|
| Type families | `--mm-font-display` = Saol Standard (serif) · `--mm-font-body` = Suisse Intl |
| Type scale | `hero` clamp(42–92px) · `h1` 20–24 · `h2` 30–40 · `h3` 20–27 · `h4` 18 · `body` 17 · `small` 14 · `micro` 12 · `eyebrow` 11 · `nav` 13 · `price` 18 |
| Type behaviour | `--mm-lh-display` 1.04 · `--mm-lh-body` 1.6 · `--mm-ls-eyebrow` .14em · `--mm-ls-nav` .18em |
| Layout | `--mm-radius` 2px · `-btn` 9px · `-card` 8px · `--mm-container` 1320px |
| Spacing | `--mm-space-1…10` = 4/8/12/16/24/32/48/64/96/128px · sections 96 desktop / 56 mobile |
| Motion | `--mm-ease` cubic-bezier(.4,0,.2,1) · `--mm-dur-1/2/3` = 150/300/600ms |

### Webfonts

Declared here via `@font-face` with relative URLs (same CDN folder):
`SaolStandard-Semibold.otf` (77 KB, **unoptimized for web**) · `SuisseIntl-Medium.woff2` (66 KB) · `SuisseIntl-Bold.woff2` (65 KB)

### Opt-in helper classes

`.mm-section-dark` `.mm-section-light` · `.mm-display` `.mm-hero` `.mm-body-font` `.mm-eyebrow` `.mm-label` `.mm-nav` · `.mm-btn` + `--primary` `--gold` `--ghost` · plus per-feature families (`.mm-bs-*` bestseller, `.mm-hk-*` herkunft, `.mm-sc-*` sticky CTA, `.mm-tst-*` testimonials, `.mm-r3-*` routine, `.mm-md-*` menu drawer).

> ⚠️ **Two parallel type systems.** Theme settings use Playfair Display + Inter (`config/settings_data.json`); the `mm-*` layer and GemPages use Saol Standard + Suisse Intl. Both ship.

---

## 7. Stock theme surface

### Modified stock files — read before touching

| File | Lines | What was changed |
|---|---|---|
| `sections/main-product.liquid` | **2,298** | **The most important CRO file.** Line 3: hardcoded `product.handle contains 'tallow-gesichtscreme'` → adds `mm-pdp-tallow mm-gallery-left`. Lines **728–762**: Koala/bundle integration — `mm-bundle-skin.css/.js`, a `<script type="application/json" id="mm-kb-thumbs">` gift-image map, `mm-koala-form-bridge.js`, `mm-koala-gallery-sync.js`. All four carry German explanatory comments about *why* the workaround exists. |
| `snippets/header-drawer.liquid` | 413 | Loads `mm-menu-drawer.css`. Contains a **hardcoded German seasonal promo** ("Sommeraktion / 2 Gratis-Produkte im Sommer-Special") — rotating it requires a code change. |
| `snippets/product-media-gallery.liquid` | 333 | Renders the custom `product-label` snippet |
| `snippets/product-label.liquid` | 14 | **Custom** — badges from `product.metafields.custom.labels` |
| `sections/header.liquid` | 650 | Inline `<style>` + 3 `<script>` |
| `layout/theme.liquid` | 409 | See §9 |

### Stock and untouched — treat as vendor

All of `locales/` (57 files), all of `config/settings_schema.json`, all `component-*.css` (40 files), all stock `sections/main-*.liquid` except `main-product`, all `templates/customers/`, and the ~32 stock JS files in `assets/`.

### Large sections — read before editing

| Section | Lines |
|---|---|
| `ss-product-ingredients-6` | 2,928 |
| `ss-hero-32` | 2,691 (33 inline `<style>` blocks) |
| `ss-comparison-table-6` | 2,398 |
| `ss-testimonials-21` | 2,352 |
| **`main-product`** | **2,298** |
| `ss-testimonial-12` | 2,266 |
| `ss-before-after-5` | 1,954 |
| `st_how-to-media` | 1,597 |
| `featured-product` | 1,505 |
| `ss-product-reviews` | 1,158 |
| `ss-tabs-block` | 1,050 |
| `st_stats-benefits` | 938 |
| `ss-counter` | 932 |
| `ss-trust-badges-3` | 718 · `header` 650 · `ss-social-proof` 639 · `slideshow` 588 · `footer` 570 · `main-search` 536 · `collapsible-content` 516 · `featured-collection` 504 |

Every `gp-section-*.liquid` should be treated as a black box.

---

## 8. Vendors & apps

### Section vendors

| Vendor | Files | Notes |
|---|---|---|
| **GemPages** | 61 `sections/gp-section-*.liquid` + 8 `snippets/gp-section-*-0.liquid` + `snippets/gp-head.liquid` + `assets/gp-global.css` (69.6 KB, compiled Tailwind 3.4.19 scoped to `.gps`) + 4 layout forks | JS is CDN-hosted (`assets.gemcommerce.com/assets-v2/gp-global.js`), not in `assets/`. Grouped per `page.gp-template-*.json`, ~11 sections each. **5 sections are orphaned** — see `ISSUES.md`. |
| **Section Store** | 16 `ss-*` + `blog-1` | Each carries 7–33 inline `<style>` blocks scoped by `section.id`, plus 1–3 inline `<script>` for carousel/counter/accordion init. |
| **Sternify** | 2 `st_*` (`st_how-to-media`, `st_stats-benefits`) | Also ships a `reset_css` app embed. |

**GemPages page templates** — each renders its own header/announcement inline:

| Template | Sections | Layout |
|---|---|---|
| `page.gp-template-605572846629945942.json` | 11 × `gp-section-6055728469…` | default |
| `page.gp-template-609108086270985138.json` | 11 × `gp-section-6091080865…` | default |
| `page.gp-template-609109154342110130.json` | 11 × `gp-section-6091091545…` | default |
| `page.gp-template-609834538952032841.json` | 11 × `gp-section-6098345391…` | **`theme.gempages.blank`** |
| `page.gp-template-624083350604219348.json` | 11 × `gp-section-6240833508…` + `-624097584780149716` | default |
| `page.gp-template-619007475424691035.json` | 1 × `gp-section-619007532953764657` | **`theme.gempages.blank`** |

### App embeds — `config/settings_data.json` → `current.blocks`

| App | Block | State | Custom code that patches it |
|---|---|---|---|
| **Microsoft Clarity** | `clarity_js` | ✅ | — (CRO session recording) |
| **Klaviyo** Email & SMS | `klaviyo-onsite-embed` | ✅ | — |
| **GemPages Builder** | `embed-gp-script-head` | ✅ | — |
| **Upsell Koala Bundles** | `deals-embed` | ✅ | `mm-koala-form-bridge.js`, `mm-koala-gallery-sync.js`, `mm-bundle-skin.css/.js` |
| **One Click Upsell** | `app-embed` + `cart-drawer` | ✅ ×2 | — |
| **Loox Reviews** | `loox-inject` | ✅ | `snippets/mm-rating.liquid` reads its metafields |
| **Essential Announcer** | `app-embed` | ✅ | `mm-announcement-stars.js` (⚠️ disabled) |
| **Essential Sticky Cart** | `app-embed` | ✅ | — |
| **Notify Me** (back-in-stock) | `app-embed` | ✅ | — |
| **UpPromote Affiliate** | `core-script` | ✅ | — |
| **EU Widerruf Pro** | `widerruf-button` | ✅ | `mm-footer-widerruf.js` |
| **Sternify** | `reset_css` | ✅ | — |
| **Recomma Product Quiz** | `recommenda_link_quiz` | ✅ | `page.quiz-4840/5528.json` |
| **Sticky ATC Bar Pro** | `stickybar` | ❌ disabled | superseded by `mm-pdp-sticky-cta` |

**Also present but not app embeds:** AliReviews / `zegsu-alireviews` (legacy product + all collection templates, as `apps` sections), Klaviyo Reviews average-rating block (only `product.bartserum` and `product.bartset`), Section Store blocks inside `main-product` (`d7a2e423-…`: shipping-info, atc-style, comments, badge, benefits-list, banner, pulse-badge).

---

## 9. Layout & config

### `layout/` — 6 files

| File | Size | Description |
|---|---|---|
| `theme.liquid` | 23.0 KB / 409 ln | **Main layout.** See breakdown below. |
| `theme.gempages.header.liquid` | 22.2 KB | Fork: `header-group` normally, **no** `footer-group` |
| `theme.gempages.footer.liquid` | 22.3 KB | Fork: `header-group` inside `display:none`, `footer-group` visible |
| `theme.gempages.blank.liquid` | 19.0 KB | Fork: no header/footer groups |
| `theme.gem-layout-none.liquid` | 19.1 KB | Auto-generated by GemPages — *"You SHOULD NOT modify source code in this file"* |
| `password.liquid` | 14.3 KB | Password page. Loads only `global.js`, `details-modal.js`, `password-modal.js`. No tracking, no app embeds. |

> ⚠️ The four GemPages files are near-identical forks of `theme.liquid`. **Any head/script change must be mirrored into all five.**

### `theme.liquid` — injection order

**`<head>`:**
1. `preconnect` → fonts.shopifycdn.com
2. `{% render 'meta-tags' %}`
3. Deferred core JS: `constants.js`, `pubsub.js`, `global.js`, `details-disclosure.js`, `details-modal.js`, `search-form.js`, conditionally `animations.js`
4. **`{{ content_for_header }}` (line 44)** — where all 14 active app embeds inject
5. `font_face` + a large inline `<style>` defining `--font-*`, `--spacing-*`, colour-scheme vars
6. `base.css` → **`mm-design-system.css` (line 261)**
7. `component-cart-items.css` via `media="print" onload` lazy trick; cart-drawer CSS bundle when `cart_type == 'drawer'`
8. `preload` for body + heading fonts
9. Conditional localization / predictive-search CSS+JS
10. Inline script adding `.shopify-design-mode`
11. **Lines 302–314: hardcoded SiteBehaviour tracker** — async script from a DigitalOcean Spaces CDN with an inline secret. Not an app embed. Present in all 5 layouts.

**Body:** skip link → `{% render 'cart-drawer' %}` → **`<div class="mm-header-group">{% sections 'header-group' %}</div>`** (custom wrapper; German comment explains it lets the announcement bar + header sit absolutely over the homepage hero without fixed pixel values) → `<main id="MainContent">{{ content_for_layout }}</main>` → `{% sections 'footer-group' %}`.

**Before `</body>`:** a11y `<ul hidden>` → inline script defining `window.shopUrl` / `routes` / `cartStrings` / `variantStrings` / `accessibilityStrings` → conditional `predictive-search.js` → conditional `cart-drawer.js` → **`mm-footer-widerruf.js` (line 407)**, the only `mm-*` script loaded globally from the layout.

> No hardcoded GA/GTM/Meta Pixel in any layout — those arrive via `content_for_header` / Shopify Customer Events.

### `sections/header-group.json`

| Key | Type | State |
|---|---|---|
| `mm_header_assets` | custom-liquid → `mm-header.css`, `mm-announcement-stars.js` | ❌ **DISABLED** |
| `custom_liquid_yeLhHi` | custom-liquid → Essential Announcer div | ❌ **DISABLED** |
| `announcement-bar` | announcement-bar (4 German announcements) | ❌ **DISABLED** |
| `header` | header — logo top-center, sticky on-scroll-up | ✅ active |

### `config/`

**`settings_schema.json`** (40.8 KB) — **100% stock Refresh 15.2.0.** Every group name is a `t:settings_schema.*` translation key; **no custom CRO settings were added.** Groups: theme_info, Logo, Colors, Typography, Layout, Animations, Buttons, Variant pills, Inputs, Cards, Collection/Blog cards, Content containers, Media, Popups, Drawers, Badges, Brand information, Social media, Search input, Currency format, Cart.

> Implication: **all custom behaviour lives in templates / `mm-*` assets — never in global theme settings.**

**`settings_data.json`** (12.6 KB) — current values:

| Setting | Value |
|---|---|
| Logo | `Space-Logo_Shopify_1.png` @ 140px |
| Heading font | `playfair_display_n4` (scale 100) |
| Body font | `inter_n4` (scale 105) |
| `page_width` | 1400 · `spacing_sections` **0** · grid 28/28 |
| Animations | **both off** (`reveal_on_scroll: false`, `hover_elements: none`) |
| Cart | `cart_type: drawer`, vendor off, note off |
| Predictive search | **disabled** |
| Cards | `card` style, radius 10 (collection/blog 18), all shadow opacity 0 |
| Socials | Instagram `menmansion.official`, TikTok `@menmansion` |
| `content_for_index` | `[]` — homepage is template-driven, not preset-driven |

**Colour schemes** — dark-first:

| Scheme | Background | Text |
|---|---|---|
| `background-1` (default) | `#191919` | `#fafaf8` |
| `background-2` | `#fafaf8` | `#fafaf8` ⚠️ **white-on-white** |
| `inverse` | `#fafaf8` | `#000000` |
| `accent-1` | `#fafaf8` | `#000000` |
| `accent-2` | `#ece8e4` | `#191919` |
| `scheme-ef8fee68-…` | `#333333` | `#fafafa` (button label `#fafafa` on button `#fafafa` ⚠️) |

### `locales/` — 57 files

Default: **`en.default.json`** (19.6 KB) + `en.default.schema.json` (96 KB). 37 storefront locales (bg, bg-BG, cs, da, de, el, en, es, fi, fr, hr, hr-HR, hu, id, it, ja, ko, lt, lt-LT, nb, nl, pl, pt-BR, pt-PT, ro, ro-RO, ru, sk, sk-SK, sl, sl-SI, sv, th, tr, vi, zh-CN, zh-TW) + 20 theme-editor `*.schema.json`. Six regional variants have no schema counterpart (Shopify Markets additions).

> ⚠️ **All 57 are stock.** `de.json` is the *smallest* storefront file (17.8 KB) even though German is the shop language — because **all customer-facing German copy is hardcoded in `sections/` and `templates/`, not in `locales/de.json`.**

---

## 10. Cheatsheet

| I need to… | Go to |
|---|---|
| Find where a piece of on-page German copy lives | `grep -rl "the text" templates/ sections/` — **not** `locales/` |
| Change global colours / type tokens | `assets/mm-design-system.css`, then `assets/base.css` |
| Change theme-wide colour schemes | `config/settings_data.json` → `current.color_schemes` |
| Edit the homepage | `templates/index.json` — inline `custom_liquid` per section |
| Edit a PDP | the matching `templates/product.<name>.json`, **not** `product.json` |
| Change something on every PDP at once | `mm_pdp_comparison` / `mm_pdp_sticky_cta` are byte-identical across 15 templates — all 15 need the edit |
| Change PDP buybox / gallery | `assets/mm-pdp-clearskinset.css/.js`, `assets/section-main-product.css`, `sections/main-product.liquid` |
| Touch bundle / upsell behaviour | `mm-koala-form-bridge.js`, `mm-koala-gallery-sync.js`, `mm-bundle-skin.css/.js` — all wrappers around the **Upsell Koala** widget |
| Change the mobile menu | `snippets/header-drawer.liquid` + `assets/mm-menu-drawer.css` |
| Change collection grid cards | the `product-grid` `custom_liquid` in each `collection.*.json` + `assets/mm-home-bestseller.css` |
| Add / remove a tracking script | `layout/theme.liquid:302` (SiteBehaviour, hardcoded) + `config/settings_data.json` `current.blocks` — **and mirror into 4 GemPages layouts** |
| Add a theme-settings control | `config/settings_schema.json` (currently 100% stock) |
| Touch a GemPages page | `snippets/gp-head.liquid`, `assets/gp-global.css`, `sections/gp-section-*.liquid`, `layout/theme.gempages.*.liquid`. Never hand-edit `theme.gem-layout-none.liquid`. |
| Understand why a workaround exists | Read the German comment above it — they explain the *why*, especially in `main-product.liquid:728-762` |
