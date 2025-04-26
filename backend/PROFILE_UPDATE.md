# Updating Profiles Table in Supabase

This guide explains how to update your Supabase database to add support for user profiles with bio and interests.

## Background

We've enhanced the user profile functionality to allow users to edit and save their bio (About Me section) and interests. These changes persist across logins.

## Steps to Update Your Database

1. **Log in to your Supabase Dashboard**
   - Navigate to your project in [Supabase](https://app.supabase.com)

2. **Open the SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New Query"

3. **Run the Migration Script**
   - Copy the entire contents of the `profile_update_migration.sql` file (also provided below)
   - Paste it into the SQL Editor
   - Run the query by clicking the "Run" button
   
4. **Verify the Changes**
   - In the left sidebar, click on "Table Editor"
   - Select the "profiles" table
   - Verify that new columns "bio" and "interests" have been added
   
## Migration Script

```sql
-- Migration script to add bio and interests fields to the profiles table

-- Check if bio column already exists, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN bio TEXT DEFAULT 'STEM enthusiast looking to explore new opportunities.';
    END IF;
END $$;

-- Check if interests column already exists, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'interests'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN interests TEXT[] DEFAULT ARRAY['Computer Science', 'Mathematics', 'Robotics'];
    END IF;
END $$;

-- Update RLS policy to ensure users can update their own profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Users can update own profile.'
    ) THEN
        CREATE POLICY "Users can update own profile."
        ON public.profiles FOR UPDATE
        USING (auth.uid() = id);
    END IF;
END $$;

-- Add user_id column if not present (for compatibility with the Profile.tsx changes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Update all existing rows to set user_id = id
        UPDATE public.profiles
        SET user_id = id
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Run this command to add an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);

-- Create insert trigger to automatically set user_id = id for new records
CREATE OR REPLACE FUNCTION set_profile_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id := NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_profile_user_id_trigger'
    ) THEN
        CREATE TRIGGER set_profile_user_id_trigger
        BEFORE INSERT ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION set_profile_user_id();
    END IF;
END $$;

-- Add policy to allow users to insert their own profile if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Users can insert own profile.'
    ) THEN
        CREATE POLICY "Users can insert own profile."
        ON public.profiles FOR INSERT
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Add a function and trigger to automatically create profiles for new users if not exists
DO $$
BEGIN
    -- Create the function if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'handle_new_user'
    ) THEN
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, full_name, email, avatar_url)
          VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'full_name',
            NEW.email,
            NEW.raw_user_meta_data->>'avatar_url'
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;
    
    -- Create the trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;
```

## Troubleshooting

- **Error about duplicate columns**: If you get an error saying that a column already exists, it means the migration script has already been partially applied. This is fine, and the script has checks to prevent duplicate changes.

- **Permissions errors**: Ensure you have admin access to your Supabase project.

- **User profile data not showing**: Make sure your application is correctly saving and retrieving data using the Supabase API. You might need to add a record to the profiles table for a new user. 

- **New users not getting profiles automatically**: The migration script includes a trigger that should create profiles for new users. If this isn't working, you may need to manually run the SQL above to create the trigger.

- **Existing users don't have profiles**: For users who registered before this update, you might need to manually create profiles for them or have them sign out and sign back in, which will attempt to create a profile. 