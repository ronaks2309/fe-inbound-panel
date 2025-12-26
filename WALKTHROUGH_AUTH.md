# User Management & Auth Implementation

I have overhauled the user sign-up and authentication process to support "Admin-created users" with specific roles (Admin/User) and Tenants.

## Summary of Changes

### 1. Backend Updates
- **Call Model**: Added `user_id` field to support assigning calls to specific users.
- **CallStatusEvent Model**: Added `user_id` field for granular event tracking.
- **Webhooks**: Updated to accept `x-user-id` header and associate events/calls with the user.
- **Calls API**: Updated `/api/{client_id}/calls` to support an optional `user_id` filter.
- **Dependencies**: Added `supabase` python client.

### 2. User Creation Script
I created a script to allow you (the Admin) to create users securely from the backend.
- **Location**: `backend/scripts/create_user.py`
- **Usage**:
  ```bash
  python backend/scripts/create_user.py
  ```
- **Functionality**:
  - Prompts for `User ID` (Username), `Password`, `Display Name`, `Tenant ID`, and `Role` (admin/user).
  - Creates a user in Supabase Auth with a "fake" email (`<userid>@fe-inbound.internal`) to satisfy Auth requirements while allowing "User ID" login.
  - Sets up user metadata (`role`, `tenant`, etc.) automatically.
  - Auto-confirms the email so they can log in immediately.

### 3. Frontend Updates
- **Login Page**: Replaced the default Supabase UI with a custom **Enterprise Portal** login form.
  - Users enter their **User ID** and **Password**.
  - System automatically handles the auth mapping.
- **Dashboard**:
  - Now filters calls based on the logged-in user's **Tenant**.
  - **Standard Users** (role: `user`) only see calls assigned to them (via `user_id`).
  - **Admins** see all calls for the tenant.
  - Header displays "Welcome: [Name] | Tenant: [ID] | Role: [Type]".

## How to Test
1. **Create a User**:
   Run the script and create a test user (e.g., `ronaks-demo-client` / `user`).
   ```powershell
   cd backend
   python scripts/create_user.py
   ```
2. **Login**:
   Go to the frontend, enter `ronaks-demo-client` and the password.
3. **Verify**:
   Check the dashboard header to see the correct Client ID and Role.

## Next Steps
- To fully utilize the "User" view, you will need to start sending the `user-id` header in your VAPI webhooks (or update the call assignment via API).
