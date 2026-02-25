# Authentication Modals and Auth Guard - Usage Guide

## Overview

This implementation provides a complete authentication flow with:
1. **Multi-step Signup Modal** - 5-step account creation process
2. **Auth Guard Component** - Protects features requiring authentication
3. **Enhanced Product Tour** - Improved styling and UX
4. **State Management** - Zustand store for modal and tour state

## Components Created

### 1. SignupModal (`src/components/auth/signup-modal.tsx`)
Multi-step modal for account creation with 5 steps:
- **Step 1**: Choose setup type (myself/team) and purpose
- **Step 2**: Personal information (name, email, password, phone)
- **Step 3**: How did you hear about us
- **Step 4**: Role selection
- **Step 5**: Firm/practice details

### 2. AuthGuard (`src/components/auth/auth-guard.tsx`)
Component and hook for protecting features:
- Shows signup modal when user tries to access protected features
- Provides fallback UI options
- Hook version for programmatic checks

### 3. Enhanced ProductTour (`src/components/tour/product-tour.tsx`)
Improved tour modal with:
- Modern gradient accents
- Better visual hierarchy
- Smooth animations
- Progress indicators

## Usage Examples

### Example 1: Protect an entire feature with AuthGuard

```tsx
import { AuthGuard } from "@/components/auth";

export default function ChatPage() {
  return (
    <AuthGuard feature="AI Chat">
      <ChatInterface />
    </AuthGuard>
  );
}
```

### Example 2: Use hook for programmatic checks

```tsx
import { useRequireAuth } from "@/components/auth";

export function DocumentBuilder() {
  const requireAuth = useRequireAuth();

  const handleCreateDocument = () => {
    if (!requireAuth("Document Builder")) return;
    
    // User is authenticated, proceed with action
    createNewDocument();
  };

  return (
    <button onClick={handleCreateDocument}>
      Create Document
    </button>
  );
}
```

### Example 3: Custom fallback UI with AuthGuard

```tsx
import { AuthGuard } from "@/components/auth";

export function DatabasePage() {
  return (
    <AuthGuard 
      feature="Legal Database"
      fallback={
        <div className="custom-prompt">
          <h2>Browse Philippine Legal Database</h2>
          <p>Sign up to access 100,000+ cases and laws</p>
        </div>
      }
    >
      <DatabaseBrowser />
    </AuthGuard>
  );
}
```

### Example 4: Add SignupModal to your layout

```tsx
// src/app/layout.tsx or main layout component
import { SignupModal } from "@/components/auth";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SignupModal />
      </body>
    </html>
  );
}
```

### Example 5: Programmatically open signup modal

```tsx
import { useSignupModalStore } from "@/stores";

export function FeatureCard() {
  const { open } = useSignupModalStore();

  return (
    <button onClick={() => open("Premium AI Features")}>
      Upgrade Now
    </button>
  );
}
```

### Example 6: Start product tour

```tsx
import { useTourStore } from "@/stores";

export function WelcomeScreen() {
  const { start } = useTourStore();

  return (
    <button onClick={start}>
      Take a Tour
    </button>
  );
}
```

## State Management

### Signup Modal Store
```typescript
const { 
  isOpen,      // Modal open state
  currentStep, // Current step (0-4)
  triggerFeature, // Feature that triggered modal
  open,        // open(feature?: string) => void
  close,       // close() => void
  next,        // next() => void
  prev,        // prev() => void
  reset        // reset() => void
} = useSignupModalStore();
```

### Auth Store
```typescript
const { 
  user,        // Current user or null
  isLoading,   // Auth loading state
  setUser,     // setUser(user) => void
  logout       // logout() => void
} = useAuthStore();
```

### Tour Store
```typescript
const { 
  isActive,    // Tour active state
  currentStep, // Current tour step
  start,       // start() => void
  next,        // next() => void
  prev,        // prev() => void
  end          // end() => void
} = useTourStore();
```

## Integration Checklist

- [ ] Add `<SignupModal />` to your root layout
- [ ] Wrap protected features with `<AuthGuard>`
- [ ] Update navigation to show tour trigger
- [ ] Test signup flow end-to-end
- [ ] Verify auth state persistence
- [ ] Test mobile responsive design
- [ ] Add analytics tracking for modal events

## Styling Customization

All components use Tailwind CSS and follow your design system:
- Primary color: `primary-600`
- Text colors: `text-primary`, `text-secondary`, `text-tertiary`
- Border radius: `rounded-xl`, `rounded-2xl`
- Shadows: `shadow-2xl`

To customize, update the className props in the components.

## API Integration

The signup modal integrates with your existing API:

**Endpoint**: `POST /api/auth/signup`

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "phone": "+639171234567",
  "purpose": "Legal work",
  "userRole": "solo",
  "firmName": "Dela Cruz Law",
  "teamSize": "Solo",
  "hoursPerWeek": 10,
  "heardFrom": "Google / Search engine"
}
```

**Response**: Sets auth-token cookie and returns user object.

## Mobile Responsive

All modals are fully responsive:
- Modal width adjusts with `max-w-*` and `mx-4` padding
- Form inputs stack vertically on mobile
- Buttons adapt to screen size
- Touch-friendly tap targets (min 44x44px)

## Accessibility

Components follow WCAG 2.1 AA guidelines:
- Keyboard navigation support
- Focus management
- ARIA labels where needed
- Proper heading hierarchy
- Color contrast ratios

## Testing Recommendations

1. **Test signup flow**:
   - Complete all 5 steps
   - Test validation on each step
   - Test back button navigation
   - Test modal close and reopening

2. **Test AuthGuard**:
   - Access protected feature when logged out
   - Access protected feature when logged in
   - Test custom fallback UI

3. **Test product tour**:
   - Complete full tour
   - Skip tour midway
   - Test on different screen sizes

## Troubleshooting

**Modal not showing**:
- Verify `<SignupModal />` is added to layout
- Check z-index conflicts (modal uses z-50)
- Verify store is properly initialized

**Auth not persisting**:
- Check cookie settings in API response
- Verify `httpOnly` and `secure` flags
- Check cookie domain and path

**Styling issues**:
- Verify Tailwind classes are being purged correctly
- Check for conflicting global styles
- Verify design tokens match your config

## Next Steps

1. Add analytics tracking to modal events
2. Implement email verification flow
3. Add social login options (Google, Facebook)
4. Create password reset flow
5. Add team invitation system
6. Implement onboarding checklist after signup
