
from database.connection import engine
from sqlalchemy import text
from sqlmodel import Session
import os

migration_file = os.path.join("database", "migrations", "01_storage_rls.sql")

with open(migration_file, "r") as f:
    sql_content = f.read()

# Reordered statements to handle dependencies (Drop Policy before Function)

statements = [
    "DROP POLICY IF EXISTS \"Secure Recording Access\" ON storage.objects;",
    
    "DROP FUNCTION IF EXISTS public.fn_can_access_recording(text);",
    
    """CREATE OR REPLACE FUNCTION public.fn_can_access_recording(object_name text) RETURNS boolean AS $$
DECLARE v_call_id text;
v_client_id text;
v_user_client_id text;
v_user_role text;
BEGIN -- extracted call_id assuming format "UUID.mp3"
v_call_id := split_part(object_name, '.', 1);
-- Get call details
SELECT client_id INTO v_client_id
    FROM public.call
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
$$ LANGUAGE plpgsql SECURITY DEFINER;""",

    """CREATE POLICY "Secure Recording Access" ON storage.objects FOR
SELECT TO authenticated USING (
        bucket_id = 'recordings'
        AND public.fn_can_access_recording(name)
    );""",

    "DROP POLICY IF EXISTS \"Allow Uploads\" ON storage.objects;",
    
    """CREATE POLICY "Allow Uploads" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'recordings');"""
]

print("Applying migration statements...")

with Session(engine) as session:
    for stmt in statements:
        print(f"Executing: {stmt[:50]}...")
        session.exec(text(stmt))
    session.commit()
    print("Migration applied successfully.")
