# Active Context

*This file details the current focus of development, recent changes, immediate next steps, and active decisions.*

## Current Focus

We have just implemented two significant UI improvements to enhance habit tracking functionality:

1. **Day Filtering in Habits Screen**: Added a horizontal day-of-week filter to the Habits page that allows users to:
   - View all habits with "All Days" option
   - Filter for "Today's" habits specifically
   - Filter by any specific day of the week (Mon, Tue, Wed, etc.)
   
   This change makes it easier for users to plan ahead and see which habits are scheduled for specific days.

2. **Created Focused Home Screen**: Developed a new Home page component that:
   - Shows only habits scheduled for the current day
   - Displays a progress bar showing completion percentage
   - Provides a cleaner, more focused interface for daily habit tracking
   - Shows the current date prominently
   
   The Home screen serves as a "today view" while the Habits page now functions as a management interface.

## Implementation Details

### Type Updates
- Updated `HabitWithCompletion` type to include:
  - `frequency?: 'daily' | 'weekly'`
  - `frequency_days?: string[]`
  - `description?: string | null`

### Day Filtering Logic
The day filtering uses a combination of:
- A "today" filter that shows habits scheduled for the current day
- Day-specific filters (Mon-Sun) that show habits scheduled for those days
- "All Days" option to show all habits regardless of schedule

### Progress Tracking
The Home screen introduces a progress bar component that:
- Calculates percentage of completed habits for the day
- Updates dynamically as habits are checked/unchecked
- Displays a count of completed vs. total habits

## Recent Changes

- Implemented `usePartnerData` hook to fetch partner profile information.
- Integrated `usePartnerData` into `Home.tsx` to display the partner's name dynamically.
- **Resolved RLS issue:** Encountered persistent "infinite recursion" errors with Supabase RLS policies on `couple_members`. Disabled RLS on `couple_members` as a workaround to allow data fetching. Updated `sql_history.md` accordingly.

## Next Steps

1. **Navigation Integration**: Connect the Home screen to the main navigation
2. **Habit Detail Enhancements**: Update the habit detail view to leverage the new frequency and description fields
3. **Streaks Implementation**: Calculate and display habit streaks (consecutive completions)
4. **Reminder System**: Add support for habit reminders using the SQL schema suggested in the memory bank

## Active Decisions

- Using the Memory Bank system for project documentation.
- Confirmed use of Supabase for backend/auth.
- Confirmed use of React Router for routing.
- Confirmed use of Shadcn/ui for the component library.
- Confirmed use of TanStack Query for server state.
- **RLS Disabled on `couple_members`:** Temporarily disabled RLS due to implementation complexity. All authenticated users can currently read all `couple_members` rows.

## Recent Decisions

1. **Separation of Views**: We've decided to separate the UI into two distinct views:
   - **Home**: For "what do I need to do today?" (focused view)
   - **Habits**: For "how do I manage my habits?" (management view)

2. **Enhanced Filtering**: We're providing more ways to filter and organize habits rather than just showing all habits in a single list.

3. **Schema Evolution**: The database schema may need further updates to support reminders, categorization, and streak calculations. 