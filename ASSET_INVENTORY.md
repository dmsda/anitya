# Acitya Notes — Creative Asset Inventory & Brand Style Guide

## 1. Brand Concept & Rationale

- **Selected Brand Identity**: **Acitya Notes** (Acitya AI)
- **Etymology**: Berasal dari bahasa Sansekerta / Kawi *"Acitya"* yang bermakna **"Ilmu Pengetahuan"** (*Knowledge, Cognition, Intellect*).
- **Brand Personality**: Intelektual, tenang (*calm*), presisi, menghargai privasi pengguna (*local-first*), modern, dan editorial.
- **Brand Tagline**: *"Your Second Brain, Right in Your Browser."* / *"Tangkap, Pahami, dan Abadikan Ilmu."*
- **Visual Direction**: Tipografi modern (*Inter* & *JetBrains Mono*), monogram geometris huruf **'A'** yang merepresentasikan buku terbuka bersayap (*wings of open knowledge*) dengan titik pusat kilau berlian emas (*spark of insight/AI cognition*).

---

## 2. Complete Asset Inventory

| Category | File Path | Format | Dimensions | Usage & Integration Point |
| :--- | :--- | :--- | :--- | :--- |
| **Brand** | `/assets/brand/logo.svg` | SVG | 320 × 80 px | Full horizontal brand identity (Mark + Wordmark) |
| **Brand** | `/assets/brand/logo-mark.svg` | SVG | 128 × 128 px | Compact standalone monogram icon (Squircle) |
| **Brand** | `/assets/brand/logo-light.svg` | SVG | 320 × 80 px | Horizontal logo for light backgrounds (`#0F172A` text) |
| **Brand** | `/assets/brand/logo-dark.svg` | SVG | 320 × 80 px | Horizontal logo for dark backgrounds (`#F8FAFC` text) |
| **Brand** | `/assets/brand/logo-mono.svg` | SVG | 128 × 128 px | High-contrast monochrome silhouette |
| **Brand** | `/assets/brand/wordmark.svg` | SVG | 200 × 48 px | Pure typographic brand mark |
| **Brand** | `/assets/brand/favicon.svg` | SVG | 32 × 32 px | Browser tab favicon |
| **Icons** | `/assets/icons/icon.svg` | SVG | Vector | Master vector icon |
| **Icons** | `/assets/icons/icon-16.png` | PNG | 16 × 16 px | Chrome extension toolbar favicon (LANCZOS 4x) |
| **Icons** | `/assets/icons/icon-32.png` | PNG | 32 × 32 px | Chrome extension menu icon |
| **Icons** | `/assets/icons/icon-48.png` | PNG | 48 × 48 px | Chrome extensions management page |
| **Icons** | `/assets/icons/icon-128.png` | PNG | 128 × 128 px | Chrome Web Store main extension icon |
| **Manifest**| `/icon/16.png` .. `128.png` | PNG | Multi | WXT auto-manifest target icons |
| **Illustrations** | `/assets/illustrations/empty-notes.svg` | SVG | 160 × 120 px | Empty state for quick notes & clipper |
| **Illustrations** | `/assets/illustrations/empty-highlights.svg` | SVG | 160 × 120 px | Empty state for web text highlights |
| **Illustrations** | `/assets/illustrations/empty-video-notes.svg` | SVG | 160 × 120 px | Empty state for YouTube video notes & frame capture |
| **Illustrations** | `/assets/illustrations/no-transcript.svg` | SVG | 160 × 120 px | Empty/unloaded state for video transcripts |
| **Illustrations** | `/assets/illustrations/no-search-results.svg` | SVG | 160 × 120 px | Empty state when library search yields no matches |
| **Illustrations** | `/assets/illustrations/ai-processing.svg` | SVG | 160 × 120 px | AI Assistant idle/processing illustration |
| **Illustrations** | `/assets/illustrations/ai-unavailable.svg` | SVG | 160 × 120 px | Offline/unsupported AI status indicator |
| **Illustrations** | `/assets/illustrations/offline-mode.svg` | SVG | 160 × 120 px | Local-first IndexedDB offline badge |
| **Illustrations** | `/assets/illustrations/export-success.svg` | SVG | 160 × 120 px | Export center download confirmation visual |
| **Illustrations** | `/assets/illustrations/privacy-shield.svg` | SVG | 160 × 120 px | Privacy guard and security guarantee |
| **Illustrations** | `/assets/illustrations/welcome-onboarding.svg`| SVG | 240 × 140 px | Hero illustration for interactive onboarding tour |
| **Marketing** | `/assets/marketing/store-small-tile.svg` | SVG | 440 × 280 px | Chrome Web Store small promotional tile |
| **Marketing** | `/assets/marketing/store-marquee.svg` | SVG | 1400 × 560 px | Chrome Web Store marquee header banner |
| **Marketing** | `/assets/marketing/social-preview.svg` | SVG | 1200 × 630 px | OpenGraph & Twitter Card social preview card |
| **Marketing** | `/assets/marketing/product-showcase.jpg`| JPEG | 1920 × 1080 px | 3D stylized isometric showcase artwork |

---

## 3. Design Token System

Stored in `src/assets/styles/theme.css`:

### Color Palette
- **Primary Electric Indigo**: `#6366F1`
- **Secondary Radiant Violet**: `#8B5CF6`
- **Accent Pink Glow**: `#D946EF`
- **Brand Gradient**: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)`
- **Insight Spark (Gold)**: `#FACC15` / `#F59E0B`
- **Success Mint**: `#10B981`
- **Info Cyan**: `#38BDF8`
- **Danger Coral**: `#EF4444`

### Surfaces
- **Dark Background (Default)**: `#090D16` (Deep Obsidian Void)
- **Dark Surface**: `#0F172A` (Slate 900)
- **Dark Card**: `rgba(30, 41, 59, 0.7)` (Slate 800 Glassmorphic)
- **Light Background**: `#F8FAFC`
- **Light Surface**: `#FFFFFF`

### Highlights Palette (W3C Anchored)
- Yellow: `#FEF08A`
- Green: `#BBF7D0`
- Blue: `#BAE6FD`
- Pink: `#FBCFE8`
- Purple: `#E9D5FF`
