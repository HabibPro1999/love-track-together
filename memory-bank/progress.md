## What Works

- Basic project structure (Vite + React + TS) and core dependencies installed.
- Routing (`App.tsx`) and Supabase client (`client.ts`) setup.
- Authentication (`AuthContext`) implemented with Supabase auth listeners and functions (`signIn`, `signUp`, `signOut`).
- **Partner Connection (`ConnectPartner.tsx`)**:
    - Logic to generate/fetch own code and connect using partner's code is implemented.
    - RLS policies corrected/disabled: SELECT on `couple_members` was causing infinite recursion; RLS is now **disabled** on this table as a workaround.
    - UI refactored to "Generate" / "Use Code" tabs.
- **Profile Page (`Profile.tsx`)**:
    - Displays user info (name, email) from Auth context.
    - Fetches and displays the user's connection code from Supabase using React Query.
    - Logout functionality implemented.
    - Basic partner disconnect logic implemented (removes user from `couple_members`, potentially deletes `couples` entry).
- **Habit List UI (`Habits.tsx`)**:
    - Displays habits (using demo data).
    - Allows adding new habits (personal/shared) via dialog (updates local demo data).
    - Allows toggling habit completion (updates local demo data).
    - Filtering tabs (All, Personal, Shared) work with demo data.
- **Habit Detail UI (`HabitDetail.tsx`)**:
    - Displays habit details based on ID from URL (using demo data).
    - Shows streak, completion history (Calendar), and distinguishes between personal/shared views (using demo data).
    - Edit/Delete dialogs are present (no backend logic).
- **Home Dashboard UI (`Home.tsx`)**:
    - Displays **dynamic partner name** fetched via `usePartnerData` hook (handles loading/error states).
    - Displays a demo sticky note.
    - Lists today's habits (using demo data) with toggle completion.
    - Includes dialog for writing a note (no backend logic).
- Basic UI components (Shadcn/ui) and utility functions (`cn`) are available.
- Placeholder pages exist for core features.

## What Needs to Be Built

- **Habit Backend Integration:**
    - Replace all demo data in `Habits.tsx`, `HabitDetail.tsx`, and `Home.tsx` with actual data fetching and mutations using Supabase and `@tanstack/react-query`.
    - Implement Supabase functions/queries for CRUD operations on habits (create, read list, read detail, update completion, delete).
    - Define clear database schema/logic for handling personal vs. shared habits, completion tracking for both partners, streaks, etc.
- **Home Dashboard Logic:**
    - Implement logic for sending/receiving sticky notes via Supabase.
    - Fetch and display *actual* relevant habits for the day.
- **Profile Page Refinements:**
    - Add functionality to edit user profile information (e.g., name).
    - Test and refine the partner disconnect logic.
- **Habit Detail Actions:**
    - Implement the actual backend logic for editing habit details (name, type, private status).
    - Implement the actual backend logic for deleting a habit.
- **Error Handling:** Enhance error handling across API calls (Supabase interactions) and user flows.
- **State Management:** Evaluate if additional client-side state management is needed beyond `AuthContext` and `TanStack Query` as features become more complex.
- **Styling & UI Polish:** Refine visual consistency, responsiveness, and overall user experience.
- **Testing:** Implement unit/integration tests.

## Current Status

- Foundational setup and authentication are functional.
- Core UI for pages is built, but relies heavily on demo data.
- Partner connection logic is partially implemented with Supabase.
- Ready for backend integration for core features (Habits, Notes).

## Known Issues

- **Security:** Supabase keys are hardcoded in `src/integrations/supabase/client.ts`. Move to environment variables.
- **Security:** RLS is disabled on `couple_members` due to implementation issues. This means any authenticated user can potentially read all `couple_members` rows (user_id, couple_id pairs). This needs review or acceptance.
- **Demo Data Reliance:** Key features (Habits, Home Notes, HabitDetail) currently use hardcoded demo data instead of interacting with the backend.
- **Incomplete Features:** Sticky note sending/receiving, habit editing/deleting backend logic, actual habit data fetching (replacing demo data) are missing.
- **Package Lock Discrepancy:** Both `bun.lockb` and `package-lock.json` exist. Confirm `bun` is primary and potentially remove `package-lock.json`.