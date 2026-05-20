# Changelog - May 12, 2026

## Branch
- **Name:** `62-add-language-options-2`
- **Base Comparison:** `main...HEAD`
- **Scope:** Full internationalization (i18n) support for the frontend — infrastructure setup, translation message files, LanguageSwitcher component, and integration across all pages.

## Change Summary
- **21 files changed**
- **+1717 insertions / -276 deletions**
- Major delivery areas:
	- next-intl infrastructure and locale resolution
	- EN/TR translation message files (10 namespaces)
	- LanguageSwitcher dropdown component
	- i18n integration across all pages and layout components
	- Presentation page STT language linked to global app locale

## Frontend Updates

### 1. i18n Infrastructure
- Added `next-intl` package to `frontend/package.json`.
- Added `frontend/i18n/request.ts` for server-side locale resolution:
	- reads `NEXT_LOCALE` cookie on each request
	- validates against `['en', 'tr']`, falls back to `'en'`
	- dynamically imports the matching message file
- Migrated `frontend/next.config.ts` → `frontend/next.config.js` to integrate `next-intl` plugin.
- Removed `frontend/next.config.ts` (superseded by `.js` config).

### 2. Translation Message Files
- Created `frontend/messages/en.json` and `frontend/messages/tr.json` (315 lines each).
- Covered namespaces:
	- `navbar` — navigation links and actions
	- `footer` — footer links and copyright
	- `home` — landing page copy
	- `login` — login form labels and errors
	- `register` — registration form labels and errors
	- `forgotPassword` — forgot password flow
	- `dashboard` — dashboard section headers and actions
	- `pricing` — pricing page content
	- `upload` — upload page labels and instructions
	- `analyze` — analyze page labels and results

### 3. LanguageSwitcher Component
- Created `frontend/app/components/LanguageSwitcher.tsx`.
- Renders a single flag button showing the active locale (🇬🇧 / 🇹🇷).
- On click, opens a dropdown listing available locales with flag + label.
- Selecting a locale sets `NEXT_LOCALE` cookie (1-year expiry) and reloads the page.
- Click-outside handler closes the dropdown automatically.
- Active locale is visually highlighted in the list.

### 4. Navbar Integration
- Added `LanguageSwitcher` to the desktop action bar in `frontend/app/components/Navbar.tsx`.
- Added `LanguageSwitcher` to the mobile menu footer section.
- Removed `overflow-hidden` from the `<nav>` element to prevent the dropdown from being clipped; added `rounded-b-[24px]` to the mobile menu panel to preserve rounded corners.

### 5. Page and Component Internationalization
- Applied `useTranslations` from `next-intl` to replace all hardcoded strings in:
	- `frontend/app/components/Navbar.tsx`
	- `frontend/app/components/Footer.tsx`
	- `frontend/app/page.tsx` (landing page)
	- `frontend/app/(auth)/login/page.tsx`
	- `frontend/app/(auth)/register/page.tsx`
	- `frontend/app/(auth)/forgot-password/page.tsx`
	- `frontend/app/dashboard/layout.tsx`
	- `frontend/app/pricing/page.tsx`
	- `frontend/app/upload/page.tsx`
	- `frontend/app/analyze/page.tsx`
- Root layout (`frontend/app/layout.tsx`) updated to wrap the app with `NextIntlClientProvider`.

### 6. Presentation Page — STT Language Sync
- Removed the standalone language toggle button from `frontend/app/presentation/[id]/page.tsx`.
- Replaced with `LanguageSwitcher` component so locale change is consistent app-wide.
- `sttLanguage` state replaced by a derived value from `useLocale()`:
	- locale `"tr"` → STT language `"tr-TR"`
	- locale `"en"` → STT language `"en-US"`
- Removed unused `Globe` icon import and `setSttLanguage` state setter.

## Functional Outcome
- The entire frontend UI is now available in English and Turkish.
- Users switch languages via the `LanguageSwitcher` dropdown in the navbar (desktop and mobile) and on the presentation page sidebar.
- Selected language persists across sessions via a cookie.
- Speech recognition on the presentation page automatically uses the language matching the active app locale.
