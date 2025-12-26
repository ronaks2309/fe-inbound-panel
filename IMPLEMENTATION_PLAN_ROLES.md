# Refactor User Roles (Agent -> User)

The user wants to rename the role "agent" to "user" for clarity. This affects the user creation script and the frontend dashboard role check.

## Proposed Changes

### Backend
#### [MODIFY] [create_user.py](file:///c:/Users/Ronak/OneDrive/Github/fe-inbound-panel/backend/scripts/create_user.py)
- Change input prompt from `(admin/agent)` to `(admin/user)`.
- Update validation logic to accept `admin` or `user`.

### Frontend
#### [MODIFY] [CallDashboard.tsx](file:///c:/Users/Ronak/OneDrive/Github/fe-inbound-panel/frontend/src/components/CallDashboard.tsx)
- Update role check: `if (role === 'agent')` -> `if (role === 'user')`.

## Verification Plan

### Automated Tests
- None.

### Manual Verification
1.  **Create New User**:
    - Run `python backend/scripts/create_user.py`.
    - Create a user with role `user`.
    - Verify script accepts 'user' and rejects 'agent'.
2.  **Verify Frontend Logic**:
    - Inspect `CallDashboard.tsx` to ensure logic filters by `user_id` when role is `user`.
