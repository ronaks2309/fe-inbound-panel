-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id text NOT NULL,
    role text NOT NULL DEFAULT 'user',
    display_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Policy: Users can see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR
SELECT USING (auth.uid() = id);
-- Policy: Admins can see all profiles in their client
-- Recursive check: allow access if the requesting user (auth.uid()) is an admin of the *same* client.
CREATE POLICY "Admins can view tenant profiles" ON public.profiles FOR
SELECT USING (
        client_id IN (
            SELECT client_id
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);