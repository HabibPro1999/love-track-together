# SQL History

*This file documents the SQL queries used to set up and manage the Supabase database schema, Row Level Security (RLS), and related functions.*

## Table Creation

These queries define the core database tables for storing user profiles, couple information, and the link between them.

```sql
-- Create profiles table to store user information
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY, -- Links to Supabase auth users, primary key
  name TEXT NOT NULL,                             -- User's display name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL -- Timestamp for record creation
);

-- Create couples table to store partner connections
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique ID for the couple
  code TEXT UNIQUE NOT NULL,                     -- Unique code used for connecting partners
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL -- Timestamp for record creation
);

-- Create couple_members table to link users to couples
CREATE TABLE public.couple_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),         -- Unique ID for the membership record
  user_id UUID REFERENCES public.profiles(id) NOT NULL,  -- Foreign key to the user's profile
  couple_id UUID REFERENCES public.couples(id) NOT NULL, -- Foreign key to the couple
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, -- Timestamp for record creation
  UNIQUE(user_id), -- Ensures a user can only belong to one couple at a time
  UNIQUE(user_id, couple_id) -- Ensures a user appears only once per couple (Added YYYY-MM-DD for Notes FK)
);
```

## Row Level Security (RLS) Setup

RLS is enabled on the core tables to control data access based on the logged-in user.

```sql
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
-- RLS for couple_members was disabled due to persistent infinite recursion errors
-- in SELECT policies when trying to allow users to view their own couple's memberships.
-- See 'RLS Policies' section below for details.
-- ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- Disable RLS on couple_members (executed to resolve recursion error)
ALTER TABLE public.couple_members DISABLE ROW LEVEL SECURITY;
```

## Automatic Profile Creation Trigger

This function and trigger automatically create a corresponding entry in the `public.profiles` table whenever a new user signs up via Supabase Auth.

```sql
-- Create profile on user creation
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into public.profiles
  INSERT INTO public.profiles (id, name)
  -- Use the new user's ID from auth.users
  -- Use the name from user metadata if available, otherwise default to 'User'
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  RETURN NEW; -- Return the new auth.users record
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Runs with the permissions of the definer

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users -- Trigger after a new user is inserted into auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); -- Call the function for each new row
```

## RLS Policies

These policies define the specific access rules for each table based on user authentication (`auth.uid()`).

```sql
-- Set up RLS policies

-- Profiles Table Policies:
-- Users can read all profiles (e.g., for searching partners)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true); -- Allows select for all authenticated users

-- Users can only update their own profile record
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id); -- Allows update only if the user's auth ID matches the profile ID

-- Couples Table Policies:
-- Users can only view the couple record they are a member of
CREATE POLICY "Users can view couples they belong to"
  ON public.couples FOR SELECT
  USING (
    -- Checks if a record exists in couple_members linking this couple to the current user
    EXISTS (
      SELECT 1 FROM public.couple_members 
      WHERE couple_members.couple_id = couples.id 
      AND couple_members.user_id = auth.uid()
    )
  );

-- Any authenticated user can create a new couple entry (e.g., when generating a code)
CREATE POLICY "Anyone can create a couple"
  ON public.couples FOR INSERT
  WITH CHECK (true);

-- Couple Members Table Policies:
-- RLS IS CURRENTLY DISABLED ON THIS TABLE.
-- Any authenticated user can read all rows in couple_members.
-- The following policies were attempted/used previously but are INACTIVE
-- because RLS is disabled on the table.

/* --- INACTIVE POLICIES (RLS Disabled) --- 
-- Original recursive policy that caused errors:
DROP POLICY IF EXISTS "Users can view memberships within their own couple" ON public.couple_members;
CREATE POLICY "Users can view memberships within their own couple"
  ON public.couple_members FOR SELECT
  USING (
    couple_id = (
      SELECT cm.couple_id
      FROM public.couple_members cm
      WHERE cm.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Attempted non-recursive fix (also inactive):
DROP POLICY IF EXISTS "Users can view memberships in their couple" ON public.couple_members;
CREATE POLICY "Users can view memberships in their couple"
  ON public.couple_members FOR SELECT
  USING (
    couple_id IN (
      SELECT cm.couple_id
      FROM public.couple_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- Insert policy (also inactive):
DROP POLICY IF EXISTS "Users can insert into couple_members when connecting" ON public.couple_members;
CREATE POLICY "Users can insert into couple_members when connecting"
  ON public.couple_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
--- END INACTIVE POLICIES --- */

-- Couples Table Policies (Continued):
-- Allows users to read all couples (necessary to check if a connection code exists)
CREATE POLICY "Users can read couples when connecting"
  ON public.couples FOR SELECT
  USING (true); -- Allows select for all authenticated users
```

## Helper Functions

These PostgreSQL functions assist with generating unique connection codes and creating new couple entries.

```sql
-- Add function to generate random unique code (Fixed Ambiguity)
CREATE OR REPLACE FUNCTION generate_unique_couple_code(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; -- Characters to use in the code
  -- Renamed local variable to avoid ambiguity with the 'code' column
  v_code TEXT := ''; 
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate random code
    v_code := ''; -- Use the renamed variable
    FOR i IN 1..length LOOP
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code exists using the renamed variable
    SELECT EXISTS (
      SELECT 1 FROM public.couples WHERE public.couples.code = v_code
    ) INTO exists_already;
    
    -- Exit loop if unique code found
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN v_code; -- Return the renamed variable
END;
$$ LANGUAGE plpgsql;

-- Add function to create couple with generated code (callable via RPC)
CREATE OR REPLACE FUNCTION create_couple_with_code()
RETURNS TABLE ( -- Returns a table structure
  couple_id UUID,
  code TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  new_code TEXT;
  new_couple_id UUID;
BEGIN
  -- Generate a unique code using the helper function
  new_code := generate_unique_couple_code();
  -- Insert the new code into the couples table and get the new couple's ID
  INSERT INTO couples (code) VALUES (new_code)
  RETURNING id INTO new_couple_id;
  
  -- Return the newly created couple ID and code
  RETURN QUERY SELECT new_couple_id, new_code;
END;
$$;
```

## Habits Schema and RLS (Added YYYY-MM-DD)

These tables and policies handle the storage and access control for personal and shared habits.

### Habits Table Creation

```sql
-- Table to store habit definitions
CREATE TABLE public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique identifier for the habit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, -- Timestamp for creation
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- The user who created the habit
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE, -- Link to couple if it's a shared habit (NULL if personal)
    name TEXT NOT NULL CHECK (char_length(name) > 0), -- Name of the habit, must not be empty
    is_private BOOLEAN DEFAULT false NOT NULL -- For personal habits (couple_id IS NULL), determines if partner can see it
);

-- Table to track habit completions
CREATE TABLE public.habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique identifier for the completion record
    habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL, -- Link to the habit being completed
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Link to the user who completed the habit
    completion_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Date the habit was completed (Date type simplifies streak calcs)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, -- Timestamp for record creation

    CONSTRAINT unique_completion_per_day UNIQUE (habit_id, user_id, completion_date) -- Ensure a user can only complete a specific habit once per day
);

-- Optional: Indexes for performance
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_couple_id ON public.habits(couple_id);
CREATE INDEX idx_habit_completions_habit_id ON public.habit_completions(habit_id);
CREATE INDEX idx_habit_completions_user_id ON public.habit_completions(user_id);
CREATE INDEX idx_habit_completions_date ON public.habit_completions(completion_date);
```

### Habits Helper Functions for RLS

```sql
-- Helper function to get the current user's couple_id (if they have one)
CREATE OR REPLACE FUNCTION get_my_couple_id()
RETURNS UUID AS $$
DECLARE
  my_couple_id UUID;
BEGIN
  SELECT couple_id INTO my_couple_id
  FROM public.couple_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN my_couple_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to get the current user's partner's user_id (if they have one)
CREATE OR REPLACE FUNCTION get_my_partner_user_id()
RETURNS UUID AS $$
DECLARE
  my_couple UUID;
  partner_user_id UUID;
BEGIN
  -- Get my couple ID first
  my_couple := get_my_couple_id();

  -- If I'm not in a couple, return NULL
  IF my_couple IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find the other user_id in the same couple
  SELECT user_id INTO partner_user_id
  FROM public.couple_members
  WHERE couple_id = my_couple
    AND user_id != auth.uid()
  LIMIT 1;

  RETURN partner_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Habits RLS Policies

```sql
-- Enable RLS on new tables
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'habits' table
-- Drop the existing policy first (important!)
DROP POLICY IF EXISTS "Users can view their own and shared habits" ON public.habits;

-- Create the new, more permissive SELECT policy
CREATE POLICY "Users can view their own, shared, and partner's public habits"
  ON public.habits FOR SELECT
  USING (
    -- It's their own personal habit
    (user_id = auth.uid())
    OR
    -- It's a habit shared within their couple
    (couple_id = get_my_couple_id())
    OR
    -- It's their partner's personal habit AND it's not private
    (user_id = get_my_partner_user_id() AND couple_id IS NULL AND is_private = false)
  );

-- INSERT: Users can create habits for themselves (personal or shared within their couple).
CREATE POLICY "Users can create habits"
  ON public.habits FOR INSERT
  WITH CHECK (
    user_id = auth.uid() -- Must be creator
    AND (couple_id IS NULL OR couple_id = get_my_couple_id()) -- If shared, must be for their own couple
  );

-- UPDATE: Users can only update habits they created.
CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete habits they created.
CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (user_id = auth.uid());


-- RLS Policies for 'habit_completions' table
-- SELECT: Users can see completions for habits they are allowed to see (their own personal, or shared within their couple).
CREATE POLICY "Users can view completions for accessible habits"
  ON public.habit_completions FOR SELECT
  USING (
    -- Check if the habit_id corresponds to a habit the user can view
    EXISTS (
        SELECT 1
        FROM public.habits h
        WHERE h.id = habit_completions.habit_id
        -- The policy on habits implicitly restricts which habits this subquery returns
    )
  );

-- INSERT: Users can add completions for themselves for habits they can access.
CREATE POLICY "Users can insert their own completions for accessible habits"
  ON public.habit_completions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() -- Can only insert for themselves
    AND EXISTS ( -- Check if the user can SELECT the habit
        SELECT 1
        FROM public.habits h
        WHERE h.id = habit_completions.habit_id
    )
  );

-- DELETE: Users can only delete their OWN completion records.
CREATE POLICY "Users can delete their own completions"
  ON public.habit_completions FOR DELETE
  USING (user_id = auth.uid());
``` 

## Frequency and Description Fields (Added 2023-06-01)

The habits table schema has been updated to include frequency and description fields.

```sql
-- Add frequency, frequency_days, and description columns to habits table
ALTER TABLE public.habits 
ADD COLUMN frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
ADD COLUMN frequency_days TEXT[] DEFAULT NULL,
ADD COLUMN description TEXT DEFAULT NULL;

-- Update indexes 
CREATE INDEX idx_habits_frequency ON public.habits(frequency);
```

### Future Considerations

**Next SQL Updates To Consider:**

1. **Habit Reminders Table**: Consider adding a `habit_reminders` table to store customized notification preferences for each habit.
   ```sql
   CREATE TABLE public.habit_reminders (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
       user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
       reminder_time TIME NOT NULL,
       enabled BOOLEAN NOT NULL DEFAULT true,
       days_of_week TEXT[] DEFAULT NULL, -- NULL means every day
       UNIQUE(habit_id, user_id) -- One reminder config per habit per user
   );
   ```

2. **Habit Categories**: Add a categories table to organize habits by type (health, work, etc.).
   ```sql
   CREATE TABLE public.habit_categories (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES public.profiles(id) NOT NULL,
       couple_id UUID REFERENCES public.couples(id),
       name TEXT NOT NULL,
       color TEXT NOT NULL DEFAULT '#666666',
       icon TEXT,
       UNIQUE(user_id, name), -- Can't have duplicate category names per user
       CONSTRAINT either_user_or_couple CHECK (
           (user_id IS NOT NULL AND couple_id IS NULL) OR 
           (user_id IS NOT NULL AND couple_id IS NOT NULL)
       )
   );
   ```

3. **Streaks Function**: Add a database function to efficiently calculate current streak for a habit:
   ```sql
   CREATE OR REPLACE FUNCTION calculate_habit_streak(p_habit_id UUID, p_user_id UUID) 
   RETURNS INTEGER AS $$
   DECLARE
       streak INTEGER := 0;
       curr_date DATE := CURRENT_DATE;
       habit_record public.habits%ROWTYPE;
       last_completion DATE;
       day_name TEXT;
       day_names TEXT[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   BEGIN
       -- Get the habit info
       SELECT * INTO habit_record FROM public.habits WHERE id = p_habit_id;
       
       -- Find the latest completion date
       SELECT MAX(completion_date) INTO last_completion
       FROM public.habit_completions
       WHERE habit_id = p_habit_id AND user_id = p_user_id;
       
       -- No completions yet
       IF last_completion IS NULL THEN
           RETURN 0;
       END IF;
       
       -- Start counting from the latest completion
       IF last_completion = curr_date THEN
           streak := 1;
           curr_date := curr_date - 1;
       ELSE
           curr_date := last_completion;
       END IF;
       
       -- Walk backwards from the current date and check for completions
       WHILE TRUE LOOP
           -- Check if this date should be counted based on frequency
           IF habit_record.frequency = 'daily' OR 
              (habit_record.frequency = 'weekly' AND
               (habit_record.frequency_days IS NULL OR
                habit_record.frequency_days @> ARRAY[day_names[EXTRACT(DOW FROM curr_date)::integer + 1]])) THEN
               
               -- Check if we have a completion for this date
               IF EXISTS (
                   SELECT 1 FROM public.habit_completions
                   WHERE habit_id = p_habit_id 
                   AND user_id = p_user_id
                   AND completion_date = curr_date
               ) THEN
                   streak := streak + 1;
                   curr_date := curr_date - 1;
               ELSE
                   -- Streak is broken
                   EXIT;
               END IF;
           ELSE
               -- Skip dates that aren't scheduled
               curr_date := curr_date - 1;
           END IF;
       END LOOP;
       
       RETURN streak;
   END;
   $$ LANGUAGE plpgsql; 
```

## Notes Schema and RLS (Added YYYY-MM-DD)

These tables and policies handle the storage and access control for partner notes.

### Notes Table Creation

```sql
-- notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 280), -- Adjust length as needed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ DEFAULT NULL, -- Optional: Track if the note was read

  -- Ensure sender and receiver are different
  CONSTRAINT sender_receiver_different CHECK (sender_user_id <> receiver_user_id),

  -- Ensure sender belongs to the couple (references the unique constraint on couple_members)
  CONSTRAINT sender_in_couple FOREIGN KEY (sender_user_id, couple_id)
    REFERENCES public.couple_members(user_id, couple_id) ON DELETE CASCADE,

  -- Ensure receiver belongs to the couple (references the unique constraint on couple_members)
  CONSTRAINT receiver_in_couple FOREIGN KEY (receiver_user_id, couple_id)
    REFERENCES public.couple_members(user_id, couple_id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX idx_notes_receiver_couple ON public.notes (receiver_user_id, couple_id, created_at DESC);
CREATE INDEX idx_notes_sender ON public.notes (sender_user_id);
CREATE INDEX idx_notes_couple ON public.notes (couple_id);
```

### Notes RLS Policies

```sql
-- RLS Policies for notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Allow users to see notes sent to them within their couple
CREATE POLICY "Allow read access to own received notes" ON public.notes
  FOR SELECT USING (
    auth.uid() = receiver_user_id AND
    couple_id = get_my_couple_id() -- Use helper function for consistency
  );

-- Allow users to send notes to their partner within their couple
-- DROP POLICY IF EXISTS "Allow insert access to send notes to partner" ON public.notes; -- Keep track of old policy
CREATE POLICY "Allow insert access to send notes to partner V2" ON public.notes
  FOR INSERT WITH CHECK (
    -- 1. Sender must be the authenticated user
    auth.uid() = sender_user_id AND
    -- 2. Sender must actually belong to the couple specified in the insert
    EXISTS (
      SELECT 1 FROM public.couple_members cm_sender
      WHERE cm_sender.user_id = sender_user_id -- Uses the value being inserted
        AND cm_sender.couple_id = couple_id    -- Uses the value being inserted
    ) AND
    -- 3. Receiver must also belong to the *same* couple specified in the insert
    EXISTS (
      SELECT 1 FROM public.couple_members cm_receiver
      WHERE cm_receiver.user_id = receiver_user_id -- Uses the value being inserted
        AND cm_receiver.couple_id = couple_id       -- Uses the value being inserted
    ) AND
    -- 4. Ensure sender and receiver are different (already in table constraint, but good for policy clarity)
    sender_user_id <> receiver_user_id
  );

-- Allow users to send notes to their partner within their couple (Old version using helpers)
-- CREATE POLICY "Allow insert access to send notes to partner" ON public.notes
--   FOR INSERT WITH CHECK (
--     auth.uid() = sender_user_id AND
--     couple_id = get_my_couple_id() AND -- Sender must belong to the couple
--     receiver_user_id = get_my_partner_user_id() -- Receiver must be the sender's partner
--   );

-- Optional: Allow users to mark notes they received as read (update read_at)
CREATE POLICY "Allow update of read_at for received notes" ON public.notes
  FOR UPDATE USING (
    auth.uid() = receiver_user_id AND
    couple_id = get_my_couple_id()
  ) WITH CHECK (
    auth.uid() = receiver_user_id -- Can only update their own received notes
    -- Ideally, restrict columns that can be updated here if needed
  );

-- Optional: Allow users to delete notes they sent (adjust if needed)
-- CREATE POLICY "Allow delete access for sent notes" ON public.notes
--   FOR DELETE USING (
--     auth.uid() = sender_user_id AND
--     couple_id = get_my_couple_id()
--   );
```

## Frequency and Description Fields (Added 2023-06-01)

The habits table schema has been updated to include frequency and description fields.

```sql
-- Add frequency, frequency_days, and description columns to habits table
ALTER TABLE public.habits 
ADD COLUMN frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
ADD COLUMN frequency_days TEXT[] DEFAULT NULL,
ADD COLUMN description TEXT DEFAULT NULL;

-- Update indexes 
CREATE INDEX idx_habits_frequency ON public.habits(frequency);
```

### Future Considerations

**Next SQL Updates To Consider:**

1. **Habit Reminders Table**: Consider adding a `habit_reminders` table to store customized notification preferences for each habit.
   ```sql
   CREATE TABLE public.habit_reminders (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
       user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
       reminder_time TIME NOT NULL,
       enabled BOOLEAN NOT NULL DEFAULT true,
       days_of_week TEXT[] DEFAULT NULL, -- NULL means every day
       UNIQUE(habit_id, user_id) -- One reminder config per habit per user
   );
   ```

2. **Habit Categories**: Add a categories table to organize habits by type (health, work, etc.).
   ```sql
   CREATE TABLE public.habit_categories (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES public.profiles(id) NOT NULL,
       couple_id UUID REFERENCES public.couples(id),
       name TEXT NOT NULL,
       color TEXT NOT NULL DEFAULT '#666666',
       icon TEXT,
       UNIQUE(user_id, name), -- Can't have duplicate category names per user
       CONSTRAINT either_user_or_couple CHECK (
           (user_id IS NOT NULL AND couple_id IS NULL) OR 
           (user_id IS NOT NULL AND couple_id IS NOT NULL)
       )
   );
   ```

3. **Streaks Function**: Add a database function to efficiently calculate current streak for a habit:
   ```sql
   CREATE OR REPLACE FUNCTION calculate_habit_streak(p_habit_id UUID, p_user_id UUID) 
   RETURNS INTEGER AS $$
   DECLARE
       streak INTEGER := 0;
       curr_date DATE := CURRENT_DATE;
       habit_record public.habits%ROWTYPE;
       last_completion DATE;
       day_name TEXT;
       day_names TEXT[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   BEGIN
       -- Get the habit info
       SELECT * INTO habit_record FROM public.habits WHERE id = p_habit_id;
       
       -- Find the latest completion date
       SELECT MAX(completion_date) INTO last_completion
       FROM public.habit_completions
       WHERE habit_id = p_habit_id AND user_id = p_user_id;
       
       -- No completions yet
       IF last_completion IS NULL THEN
           RETURN 0;
       END IF;
       
       -- Start counting from the latest completion
       IF last_completion = curr_date THEN
           streak := 1;
           curr_date := curr_date - 1;
       ELSE
           curr_date := last_completion;
       END IF;
       
       -- Walk backwards from the current date and check for completions
       WHILE TRUE LOOP
           -- Check if this date should be counted based on frequency
           IF habit_record.frequency = 'daily' OR 
              (habit_record.frequency = 'weekly' AND
               (habit_record.frequency_days IS NULL OR
                habit_record.frequency_days @> ARRAY[day_names[EXTRACT(DOW FROM curr_date)::integer + 1]])) THEN
               
               -- Check if we have a completion for this date
               IF EXISTS (
                   SELECT 1 FROM public.habit_completions
                   WHERE habit_id = p_habit_id 
                   AND user_id = p_user_id
                   AND completion_date = curr_date
               ) THEN
                   streak := streak + 1;
                   curr_date := curr_date - 1;
               ELSE
                   -- Streak is broken
                   EXIT;
               END IF;
           ELSE
               -- Skip dates that aren't scheduled
               curr_date := curr_date - 1;
           END IF;
       END LOOP;
       
       RETURN streak;
   END;
   $$ LANGUAGE plpgsql; 