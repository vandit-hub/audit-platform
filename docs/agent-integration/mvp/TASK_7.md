# Task 7: Add Navigation Link

**Duration:** 15 minutes

## File to Modify

`src/components/NavBar.tsx`

## Implementation

Add a navigation link to the AI Assistant page in the main navigation bar.

### Step 1: Locate the Navigation Links

Find the section in `NavBar.tsx` where navigation links are rendered. It should look something like this:

```typescript
<nav className="hidden md:flex items-center gap-1">
  {showPlants && (
    <Link href="/plants" className={navLinkClass("/plants")}>Plants</Link>
  )}
  {showAudits && (
    <Link href="/audits" className={navLinkClass("/audits")}>Audits</Link>
  )}
  {showObservations && (
    <Link href="/observations" className={navLinkClass("/observations")}>Observations</Link>
  )}
  {/* ... other links */}
</nav>
```

### Step 2: Add the AI Assistant Link

Add the following link after the existing navigation items:

```typescript
{/* AI Assistant link */}
<Link
  href="/agent-chat"
  className={navLinkClass("/agent-chat")}
>
  AI Assistant
</Link>
```

### Complete Example

```typescript
<nav className="hidden md:flex items-center gap-1">
  {showPlants && (
    <Link href="/plants" className={navLinkClass("/plants")}>Plants</Link>
  )}
  {showAudits && (
    <Link href="/audits" className={navLinkClass("/audits")}>Audits</Link>
  )}
  {showObservations && (
    <Link href="/observations" className={navLinkClass("/observations")}>Observations</Link>
  )}
  {showReports && (
    <Link href="/reports" className={navLinkClass("/reports")}>Reports</Link>
  )}
  {showUsers && (
    <Link href="/admin/users" className={navLinkClass("/admin/users")}>Users</Link>
  )}
  {/* AI Assistant - new link */}
  <Link
    href="/agent-chat"
    className={navLinkClass("/agent-chat")}
  >
    AI Assistant
  </Link>
</nav>
```

## Notes

- The link is shown to all authenticated users (no role restriction in MVP)
- The `navLinkClass` function handles active state styling
- The link will be highlighted when the user is on `/agent-chat` page

## Optional: Add Role-Based Visibility

If you want to restrict access to certain roles only, you can add:

```typescript
const showAIAssistant = userRole && !isGuest(userRole); // Example: hide from guests

{showAIAssistant && (
  <Link href="/agent-chat" className={navLinkClass("/agent-chat")}>
    AI Assistant
  </Link>
)}
```

But for MVP, showing to all users is fine.

## Verification

After completing this task:
- [ ] NavBar displays "AI Assistant" link
- [ ] Clicking link navigates to `/agent-chat`
- [ ] Link is highlighted when on agent chat page
- [ ] Link appears in correct position in nav bar
- [ ] No styling issues

## Next Task

Proceed to **TASK_8.md** - Manual Testing
