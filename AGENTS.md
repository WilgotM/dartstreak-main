# AGENTS.md

## Commands

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- No test framework configured

## Architecture

- **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (auth, database)
- **Routing**: react-router-dom with HashRouter
- **State**: TanStack Query for server state, React Context for auth
- **i18n**: i18next with browser language detection

## Structure

- `src/components/` - React components (ui/ for shadcn primitives)
- `src/hooks/` - Custom hooks (useAuth, useFriends, useStats, etc.)
- `src/pages/` - Route page components
- `src/integrations/supabase/` - Supabase client and generated types

## Code Style

- Use `@/*` path alias for imports from `src/`
- Components: PascalCase files, default exports
- Hooks: camelCase with `use` prefix
- Use Radix UI primitives via shadcn/ui; use `cn()` from `@/lib/utils` for class merging
- TypeScript with relaxed strictness (no implicit any off, nullable checks off)

## Legal Compliance

- **Update Legal Pages**: When adding new features (e.g., third-party integrations, new data collection, significant functionality changes), you MUST review and update `src/pages/Legal.tsx` (Privacy Policy & Terms of Service) to reflect these changes.
- **Privacy First**: Always document what data is collected and how it is used.

## i18n Requirements

- **TRANSLATE EVERYTHING FOR ALL LANGUAGES**: This is absolutely critical. When adding or changing any user-facing text in the app, you MUST add/update translations for ALL 8 app locale files in `src/i18n/locales/`.
  - Supported languages: English (`en.json`), Swedish (`sv.json`), Danish (`da.json`), German (`de.json`), Spanish (`es.json`), French (`fr.json`), Dutch (`nl.json`), Norwegian (`no.json`).
  - DO NOT just copy the English text into non-English files. You MUST actually translate the strings into the correct language.
  - DO NOT just use the `manage-translations` skill script (which only does EN/SV), you must update ALL JSON files.
- **No Partial i18n Changes**: Do not leave a translation key added in only one or some languages. It breaks the app for users matching the other locales.
- **Mandatory Validation**: After i18n changes, ALWAYS run `npm run lint` and ensure it passes before finishing.
