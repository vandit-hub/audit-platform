# Manual Login Test Instructions

To test if authentication actually works via browser:

## Test Steps

1. **Open browser** to http://localhost:3005/login

2. **Login with CFO credentials:**
   - Email: cfo@example.com
   - Password: cfo123

3. **After login, open DevTools** (F12 or Cmd+Opt+I)

4. **Check cookies:**
   - Go to Application > Cookies > http://localhost:3005
   - Look for `authjs.session-token`
   - Note if it exists

5. **Check session API:**
   - Navigate to: http://localhost:3005/api/auth/session
   - Observe the JSON response
   - Expected: `{ "user": { "id": "...", "email": "cfo@example.com", "role": "CFO", ... }, "expires": "..." }`
   - Problem: `null` or missing `role` field

6. **Try accessing protected page:**
   - Navigate to: http://localhost:3005/audits
   - Expected: Should load the audits page
   - Problem: Redirected back to /login

7. **Check console for errors:**
   - Look for any JavaScript errors
   - Check Network tab for failed API calls

## Expected Results

If authentication is working:
- ✓ Session cookie is present
- ✓ /api/auth/session returns user object with role
- ✓ Can access /audits page
- ✓ Can access /api/v1/audits API

If authentication is broken:
- ✗ Session cookie missing or invalid
- ✗ /api/auth/session returns null
- ✗ Redirected to /login when accessing protected pages
- ✗ API calls return 403 Forbidden

## Analysis

The backend tester reported that session.user.role is undefined.
This test will confirm if this is:
- A real issue (happens in browser too) → CRITICAL BUG
- A testing artifact (browser works fine) → FALSE POSITIVE
