# Technical Context

*This file describes the technologies used, development setup, technical constraints, and dependencies.*

## Core Technologies

- **Framework:** React (`react`, `react-dom`)
- **Language:** TypeScript (`typescript`)
- **Build Tool:** Vite (`vite`, `@vitejs/plugin-react-swc`)
- **Styling:** Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`) with `tailwindcss-animate` plugin. Uses CSS variables for theming. Dark mode enabled via class.
- **UI Components:** Shadcn/ui (indicated by `components.json` and numerous `@radix-ui/*` dependencies)
- **Routing:** React Router (`react-router-dom`)
- **State Management:** React Context API (`AuthContext.tsx`) for auth state. TanStack Query (`@tanstack/react-query`) is used for server state/caching.
- **Forms:** React Hook Form (`react-hook-form`) with Zod (`zod`) for validation (`@hookform/resolvers`).
- **Backend/DB:** Supabase (`@supabase/supabase-js`). Client initialized in `src/integrations/supabase/client.ts` using hardcoded keys (consider moving to env vars). Uses generated types from `src/integrations/supabase/types.ts`. RLS is generally enabled, but **disabled** for the `couple_members` table due to recursion issues (see `sql_history.md`).
- **Linting:** ESLint (`eslint`, `@typescript-eslint/eslint-plugin`) configured via `eslint.config.js`.

## Development Setup

- **Package Manager:** Bun (`bun.lockb` exists). npm's `package-lock.json` might be residual; primary commands should use `bun`.
- **Run Dev Server:** `bun dev` - Runs on `http://localhost:8080` by default (`vite.config.ts`).
- **Build:** `bun run build`.
- **Linting:** `bun run lint`.
- **Path Aliases:** `@` resolves to `./src` (`vite.config.ts`, `tsconfig.json`).

## Key Dependencies (Selected)

- `lucide-react` (Icons)
- `date-fns` (Date utility)
- `sonner` (Toast notifications)
- `recharts` (Charting)
- `cmdk` (Command menu)
- `embla-carousel-react` (Carousel)
- `vaul` (Drawer component)

## Technical Constraints

- *(Any known limitations, e.g., browser support, performance targets)*

## Environment Variables

- Supabase URL and Key are currently hardcoded in `src/integrations/supabase/client.ts`. **Recommendation:** Move these to environment variables (e.g., `.env`) for security and flexibility. Access them using `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` in `client.ts`. 