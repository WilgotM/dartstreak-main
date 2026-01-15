# AGENTS.md

## Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- No test framework configured

## Architecture
- **Stack**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (auth, database, edge functions in `supabase/`)
- **Routing**: react-router-dom with HashRouter
- **State**: TanStack Query for server state, React Context for auth
- **i18n**: i18next with browser language detection

## Structure
- `src/components/` - React components (ui/ for shadcn primitives)
- `src/hooks/` - Custom hooks (useAuth, useMatch, useTournaments, etc.)
- `src/pages/` - Route page components
- `src/integrations/supabase/` - Supabase client and generated types

## Code Style
- Use `@/*` path alias for imports from `src/`
- Components: PascalCase files, default exports
- Hooks: camelCase with `use` prefix
- Use Radix UI primitives via shadcn/ui; use `cn()` from `@/lib/utils` for class merging
- TypeScript with relaxed strictness (no implicit any off, nullable checks off)
