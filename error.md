# Dashboard Page Error - Next.js 15.x clientReferenceManifest Issue

## Error Description

The dashboard page (`/`) throws a critical error in production build:

```
TypeError: Cannot read properties of undefined (reading 'clientModules')
```

This appears to be a Next.js 15.x bug related to the `clientReferenceManifest` not being properly defined for certain page components.

## Error Details

- **Affected Route**: `/` (dashboard home page)
- **Error Type**: Next.js internal error
- **Environment**: Production build only (works in development)
- **Next.js Version**: Originally 15.5.3, also occurs in 15.1.0
- **Error Message**: "Expected clientReferenceManifest to be defined. This is a bug in Next.js"

## Impact

- Dashboard page returns HTTP 500 error
- All other pages work correctly (login, observations, API endpoints)
- Prevents users from accessing the main dashboard after login

## Solutions Attempted

### 1. Downgrade Next.js Version
**Attempted versions:**
- 15.5.3 (original) - Error occurs
- 15.4.0 - React compatibility issues
- 15.0.3 - React version mismatch
- 15.1.0 (current) - Error still occurs

**Result**: Issue persists across Next.js 15.x versions

### 2. Disable Standalone Build
Modified `next.config.js`:
```javascript
// output: 'standalone', // Disabled to avoid clientReferenceManifest error
```

Changed Dockerfile to use standard Next.js build instead of standalone.

**Result**: Error still occurs

### 3. Server-side Redirect
Implemented server-side redirect using Next.js `redirect()`:
```typescript
import { redirect } from "next/navigation";

export default function DashboardHome() {
  redirect("/observations");
}
```

**Result**: Error occurs even with just redirect code

### 4. Client-side Redirect
Changed to client component with `useRouter`:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardHome() {
  const router = useRouter();

  useEffect(() => {
    router.push('/observations');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to observations...</p>
      </div>
    </div>
  );
}
```

**Result**: Error still occurs when accessing the page

## Current Workaround

The dashboard page redirects to `/observations` page, but the error still appears when accessing `/`. Users can navigate directly to other pages which all work correctly.

## Docker Deployment Status

Despite the dashboard error, the Docker deployment is fully functional:
- ✅ All containers running (PostgreSQL, App, WebSocket, Nginx)
- ✅ Database connections working
- ✅ API endpoints functional
- ✅ Authentication working
- ✅ All other pages render correctly

## Recommendations

1. **Short-term**: Use the current redirect workaround and access the app via `/observations` or other pages
2. **Medium-term**: Consider upgrading to Next.js 16.x when available or downgrading to Next.js 14.x
3. **Long-term**: Report issue to Next.js team as it appears to be a framework bug

## Related Issues

This appears to be related to Next.js App Router and React Server Components (RSC) architecture. Similar issues have been reported in Next.js GitHub repository for version 15.x.