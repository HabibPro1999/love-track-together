# System Patterns

*This file documents the system architecture, key technical decisions, design patterns employed, and component relationships.*

## Architecture Overview

- **Single Page Application (SPA):** Built with React and Vite.
- **Client-Server:** Frontend interacts with Supabase for backend services (authentication, database).

## Key Technical Decisions

- **React + TypeScript:** For building the user interface with type safety.
- **Vite:** For fast development server and build process.
- **React Router:** For client-side routing (`BrowserRouter`).
- **Supabase:** As the Backend-as-a-Service (BaaS) provider for authentication and database.
- **TanStack Query:** For managing server state, caching, and data fetching.
- **Shadcn/ui:** For pre-built, customizable UI components leveraging Tailwind CSS.
- **Tailwind CSS:** For utility-first styling.

## Design Patterns

- **Context API:** Used for global state management, specifically Authentication (`AuthContext.tsx`). The `useAuth` hook provides access.
- **Provider Pattern:** Used extensively (`QueryClientProvider`, `TooltipProvider`, `AuthProvider`).
- **Component-Based Architecture:** Standard React pattern.
- **Utility Functions:** `cn` function in `lib/utils.ts` combines `clsx` and `tailwind-merge` for conditional class names.
- **Hooks:** Custom hooks are used (`useAuth`, `use-mobile.tsx`, `use-toast.ts`, `usePartnerData.ts`).
- **Database Access Control:** Primarily intended to use Supabase Row Level Security (RLS). However, RLS is currently **disabled** on the `couple_members` table due to persistent recursive policy errors. Access control for this specific table relies on application-level logic for now.

## Component Relationships

- `main.tsx`: Renders the root `App` component.
- `App.tsx`: Sets up providers (`QueryClientProvider`, `TooltipProvider`, `BrowserRouter`, `AuthProvider`) and defines routes using `react-router-dom`. Routes map paths to Page components (e.g., `/login` -> `Login.tsx`).
- **Page Components** (`src/pages/*`): Represent distinct views/screens, fetch data (likely using TanStack Query and `useAuth`), and compose UI components.
- **UI Components** (`src/components/ui/*`): Reusable Shadcn/ui building blocks.
- **Custom Components** (`src/components/*`): Project-specific components like `BottomNav`, `HabitItem`.
- **AuthContext:** Provides user/session state and auth functions (`signIn`, `signUp`, `signOut`) to components via the `useAuth` hook.
- **Supabase Client** (`src/integrations/supabase/client.ts`): Centralized Supabase client instance used for interactions.

## Diagrams

- *(Diagrams can be added here or linked)* 