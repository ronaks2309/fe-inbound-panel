# Routing Strategy: The "Production" Setup 🌐

You want:
1.  **Landing Page** (`ronak-app.com`) -> Hero + Login.
2.  **Dashboard** (`app.ronak-app.com` OR `ronak-app.com/dashboard`) -> The Tool.
3.  **Admin** (`coolify.ronak-app.com`) -> Coolify.
4.  **DB Admin** (`supabase.ronak-app.com`) -> Supabase Studio.

## Recommendation: The "Clean Single Domain" Strategy
Since you are a **single developer** managing one codebase, I strongly recommend keeping the App and Landing Page together on one domain, separated by routes. Subdomains add CORS complexity (cookies/auth sharing issues across domains).

**Proposed Structure:**
*   `ronak-app.com/` -> **Landing Page** (Public)
*   `ronak-app.com/login` -> **Login Page** (Supabase Auth)
*   `ronak-app.com/dashboard` -> **Call Dashboard** (Protected)

*This is how companies like Linear, Airbnb, and Facebook work.*

## Infrastructure Mapping (Coolify)

| Service | Domain | Function |
| :--- | :--- | :--- |
| **Coolify** | `coolify.ronak-app.com` | Managing your server |
| **Supabase Studio** | `supabase.ronak-app.com` | Managing your Database |
| **Frontend Container** | `ronak-app.com` | Serving React (Landing + App) |
| **Backend Container** | `api.ronak-app.com` | API (Hidden usage) |

## Implementation Plan

### 1. Install React Router
We need to turn `App.tsx` from "Just Dashboard" into a "Router".
*   Install `react-router-dom`.

### 2. Create New Pages
*   `src/pages/LandingPage.tsx`: The hero section ("Boost your sales...").
*   `src/pages/LoginPage.tsx`: Supabase Login form.
*   `src/pages/Dashboard.tsx`: Wrapper for your existing `CallDashboard`.

### 3. Update nginx.conf
Ensure all routes (`/login`, `/dashboard`) redirect to `index.html` so React Router can handle them (We already did this in the Dockerfile! ✅).

### 4. Protected Routes (The Redirect Logic)
To handle your question: "If they go to /dashboard directly, do they get redirected?"
**Yes.** We wrap the Dashboard in a special component.

```tsx
// src/components/ProtectedRoute.tsx
const ProtectedRoute = ({ children }) => {
  const { session } = useSupabaseAuth(); // Custom hook
  
  if (!session) {
    // Not logged in? Go to Login
    return <Navigate to="/login" replace />;
  }

  // Logged in? Show the Dashboard
  return children;
};

// Usage in App.tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <CallDashboard />
  </ProtectedRoute>
} />
```

### 5. Supabase Access
When you install Supabase via Coolify, it asks for a "Studio Domain". You just type `supabase.ronak-app.com` and it handles the routing automatically.
