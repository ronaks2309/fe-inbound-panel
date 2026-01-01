-- RLS Policy and Helper Function
-- We assume "Enable Row Level Security" is already set for storage.objects
-- If NOT, you might need to enable it via the Supabase Dashboard (Storage -> Configuration).
-- 1. Helper Function
-- Drop first to allow updates
DROP FUNCTION IF EXISTS public.fn_can_access_recording(text);
CREATE OR REPLACE FUNCTION public.fn_can_access_recording(object_name text) RETURNS boolean AS $$
DECLARE v_call_id text;
v_client_id text;
v_user_client_id text;
v_user_role text;
BEGIN -- extracted call_id assuming format "UUID.mp3"
v_call_id := split_part(object_name, '.', 1);
-- Get call details
SELECT client_id INTO v_client_id
FROM public.calls
WHERE id = v_call_id;
IF v_client_id IS NULL THEN RETURN false;
END IF;
-- Get requesting user's details
SELECT client_id,
    role INTO v_user_client_id,
    v_user_role
FROM public.profiles
WHERE id = auth.uid();
-- Admin bypass
IF v_user_role = 'admin' THEN RETURN true;
END IF;
-- Check client match
IF v_client_id = v_user_client_id THEN RETURN true;
END IF;
RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. Create Policy for Reading (SELECT)
DROP POLICY IF EXISTS "Secure Recording Access" ON storage.objects;
CREATE POLICY "Secure Recording Access" ON storage.objects FOR
SELECT TO authenticated USING (
        bucket_id = 'recordings'
        AND public.fn_can_access_recording(name)
    );
-- 3. Allow Uploads (INSERT)
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'recordings');