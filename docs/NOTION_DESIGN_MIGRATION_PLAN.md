# Notion Design System Migration Plan

**Project**: EZAudit Audit Platform
**Date**: 2025-11-07
**Status**: Phases 1-5 complete (2025-11-07); Phase 6 in progress
**Approach**: Incremental migration using Tailwind CSS with Notion design tokens

---

## Executive Summary

This document outlines the plan to migrate the EZAudit audit platform from its current design system to a Notion-inspired design system while maintaining the Tailwind CSS framework. The migration will be incremental, starting with design tokens and core components, then progressively updating all pages and features.

---

## Current State Analysis

### Technology Stack
- **CSS Framework**: Tailwind CSS v3.4.7
- **Component Library**: Custom UI components in `src/components/ui/`
- **Styling Approach**: Utility-first with custom component classes
- **Font**: Inter (Google Fonts) - weights 400, 500, 600, 700
- **No CSS Variables**: All tokens defined in Tailwind config
- **No Dark Mode**: Light mode only

### Existing Components
- Button, Card, Input, Select, Badge, EmptyState, Spinner
- NavBar, Toast, RoleBadge, DashboardContent, PresenceBadge, SessionTimeout

### Pages to Update
- Authentication: `/login`, `/accept-invite`
- Dashboard: `/dashboard`
- Data Management: `/plants`, `/audits`, `/observations`, `/checklists`
- Reports: `/reports`
- Admin: `/admin/users`, `/admin/import`
- AI: `/ai`

---

## Design Decisions

### 1. CSS Framework Approach
**Decision**: Keep Tailwind CSS, adapt Notion design tokens to Tailwind config

**Rationale**:
- Existing codebase heavily uses Tailwind utilities
- Complete rewrite to vanilla CSS would be too disruptive
- Tailwind config can accommodate all Notion design tokens
- Maintains developer velocity and familiarity

### 2. Migration Strategy
**Decision**: Incremental migration starting with design tokens and core components

**Rationale**:
- Lower risk - can test after each phase
- Allows rollback if issues arise
- Team can learn new system gradually
- Minimizes disruption to ongoing development

### 3. Priority Focus
**Decision**: Comprehensive update with emphasis on core components → tables → all pages

**Rationale**:
- Core components used throughout the app - high leverage
- Tables are central to audit workflow and Notion aesthetic
- Comprehensive approach ensures consistent UI/UX

### 4. Dark Mode
**Decision**: Focus on light mode only for this migration

**Rationale**:
- Style guide only defines light mode
- Reduces scope and complexity
- Can be added as future enhancement
- Faster time to completion

---

## Migration Phases

## Phase 1: Design Token Foundation

**Objective**: Update Tailwind configuration with complete Notion design token system

> ✅ Completed 2025-11-07 — Tailwind design tokens implemented in `tailwind.config.ts`.

### 1.1 Color System

#### Grayscale (Base Colors)
Replace current neutral palette with Notion's carefully crafted grayscale:

```typescript
gray: {
  100: '#fcfbfb',  // Lightest gray - subtle backgrounds
  200: '#f6f5f4',  // Light gray - card backgrounds, sections
  300: '#dfdcd9',  // Border gray - subtle dividers
  400: '#a39e98',  // Medium gray - disabled states
  500: '#78736f',  // Text gray - secondary text
  600: '#615d59',  // Dark gray - tertiary text
  700: '#494744',  // Darker gray - headings
  800: '#31302e',  // Very dark - primary elements
  900: '#191918',  // Darkest - primary text, high contrast
}
```

#### Semantic Colors
Add Notion-specific semantic color tokens:

```typescript
notion: {
  // Backgrounds
  bacPri: '#ffffff',    // Primary background
  bacSec: '#f7f6f3',    // Secondary background
  bacHov: '#f1f0ee',    // Hover state background

  // Text
  texPri: '#37352f',    // Primary text
  texSec: '#787774',    // Secondary text
  texTer: '#9b9a97',    // Tertiary text

  // Borders
  borPri: 'rgba(0, 0, 0, 0.09)',  // Primary border
}
```

#### Accent Colors (Status & Actions)

**Blue (Primary Action)**:
```typescript
blue: {
  600: '#2383e2',  // Primary blue - buttons, links
  700: '#105fad',  // Darker blue - hover states
  100: 'rgba(35, 131, 226, 0.07)',   // Light bg
  200: 'rgba(35, 131, 226, 0.14)',   // Tinted bg
}
```

**Green (Success/Complete)**:
```typescript
green: {
  500: '#448361',  // Primary green
  100: 'rgba(123, 183, 129, 0.27)',  // Light green bg
}
```

**Pink/Red (Alert/Blocked)**:
```typescript
pink: {
  500: '#c14c8a',  // Primary pink
  100: 'rgba(225, 136, 179, 0.27)',  // Light pink bg
}
```

**Purple (Secondary Accent)**:
```typescript
purple: {
  500: '#9065b0',  // Primary purple
  100: 'rgba(168, 129, 197, 0.27)',  // Light purple bg
}
```

#### Transparent Color System
```typescript
border: {
  regular: 'rgba(0, 0, 0, 0.08)',
},
text: {
  extraLight: 'rgba(0, 0, 0, 0.2)',
  light: 'rgba(0, 0, 0, 0.4)',
  medium: 'rgba(0, 0, 0, 0.6)',
}
```

### 1.2 Typography System

#### Font Scale with Line Heights
```typescript
fontSize: {
  xs: ['0.75rem', { lineHeight: '1.05rem' }],      // 12px - Table headers, captions
  sm: ['0.875rem', { lineHeight: '1.225rem' }],    // 14px - Button text, labels
  base: ['1rem', { lineHeight: '1.5rem' }],        // 16px - Body text
  lg: ['1.125rem', { lineHeight: '1.8rem' }],      // 18px - Feature descriptions
  xl: ['1.25rem', { lineHeight: '1.625rem' }],     // 20px - Subheadings
  '2xl': ['2rem', { lineHeight: '2.4rem' }],       // 32px - Headings
  '3xl': ['3rem', { lineHeight: '3.3rem' }],       // 48px - Section titles
  '4xl': ['4rem', { lineHeight: '4rem' }],         // 64px - Large stat numbers
}
```

#### Letter Spacing
```typescript
letterSpacing: {
  tight: '-0.02em',    // Large display text
  normal: '0',         // Body text
  wide: '0.5px',       // Labels, eyebrows
}
```

### 1.3 Spacing System (8px Grid)

```typescript
spacing: {
  // Base spacing
  '5': '20px',      // xs - Extra small spacing
  '10': '40px',     // s - Small spacing
  '15': '60px',     // l - Large spacing (mobile)
  '20': '80px',     // l - Large spacing (tablet)
  '30': '120px',    // l - Large spacing (desktop)
  '40': '160px',    // xl - Extra large spacing

  // Component-specific
  '18': '72px',
  '22': '88px',
  '26': '104px',
}
```

### 1.4 Border Radius Scale

```typescript
borderRadius: {
  '200': '0.25rem',      // 4px - Small (checkboxes)
  '300': '0.3125rem',    // 5px - Tags, badges
  '400': '0.375rem',     // 6px - Buttons, inputs
  '500': '0.5rem',       // 8px - Cards, tables
  '600': '0.625rem',     // 10px - Reserved
  '700': '0.75rem',      // 12px - Large cards
  'round': '624.9375rem', // 9999px - Circular
}
```

### 1.5 Shadow System (Minimal)

Notion uses minimal shadows, preferring borders:

```typescript
boxShadow: {
  'subtle': '0 1px 2px rgba(0, 0, 0, 0.04)',      // Level 1
  'raised': '0 2px 4px rgba(0, 0, 0, 0.06)',      // Level 2
  'floating': '0 4px 8px rgba(0, 0, 0, 0.08)',    // Level 3
  'modal': '0 8px 16px rgba(0, 0, 0, 0.12)',      // Level 4
  'dropdown': '0 12px 24px rgba(0, 0, 0, 0.15)',  // Level 5
}
```

### 1.6 Transition Timing

```typescript
transitionDuration: {
  '150': '150ms',   // Quick - hover states, table rows
  '200': '200ms',   // Standard - buttons, links
  '300': '300ms',   // Slower - modals, drawers
}
```

**Deliverables**:
- ✅ Updated `tailwind.config.ts` with all Notion design tokens
- ✅ Documented color usage matrix
- ✅ Typography scale reference

---

## Phase 2: Global CSS Updates

**Objective**: Update global styles with Notion base styles and component classes

> ✅ Completed 2025-11-07 — Notion base and component utility classes added to `src/app/globals.css`.

### 2.1 Base Styles

Update `src/app/globals.css`:

```css
@layer base {
  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply font-sans text-base text-gray-900;
    background: #ffffff;
  }

  /* Selection highlight */
  ::selection {
    background: rgba(35, 131, 226, 0.28);
  }
}
```

### 2.2 Component Classes

Add Notion-inspired component classes:

```css
@layer components {
  /* Buttons */
  .btn-primary {
    @apply bg-gray-900 text-white px-4 py-2 rounded-400;
    @apply font-medium text-sm transition-all duration-200;
  }

  .btn-primary:hover {
    @apply bg-gray-700;
  }

  .btn-secondary {
    @apply bg-transparent text-gray-900 px-4 py-2 rounded-400;
    @apply font-medium text-sm transition-all duration-200;
  }

  .btn-secondary:hover {
    @apply bg-gray-200;
  }

  /* Cards */
  .stat-card {
    @apply bg-gray-200 rounded-700 p-12 text-center;
  }

  .feature-card {
    @apply bg-white border border-border-regular rounded-700 p-8;
  }

  /* Status Badges */
  .notion-status {
    @apply inline-flex items-center px-2 py-1 rounded-300;
    @apply text-sm font-medium whitespace-nowrap;
  }

  .status-done {
    @apply bg-green-100 text-green-500;
  }

  .status-in-progress {
    @apply bg-blue-100 text-blue-700;
  }

  .status-blocked {
    @apply bg-pink-100 text-pink-500;
  }

  /* Tags */
  .notion-tag {
    @apply inline-flex items-center px-2 py-0.5 rounded-300;
    @apply text-xs font-medium whitespace-nowrap;
  }

  /* Avatars */
  .notion-avatar {
    @apply w-5 h-5 rounded-full bg-blue-600 text-white;
    @apply flex items-center justify-center text-xs font-semibold;
  }

  /* Checkboxes */
  .notion-checkbox {
    @apply w-4 h-4 border-2 border-notion-borPri rounded-200;
    @apply cursor-pointer appearance-none transition-all duration-150;
  }

  .notion-checkbox:checked {
    @apply bg-blue-600 border-blue-600;
  }

  /* Focus rings */
  .focus-ring {
    @apply outline-none ring-2 ring-blue-600 ring-offset-2;
  }
}
```

**Deliverables**:
- ✅ Updated `globals.css` with Notion base styles
- ✅ Complete set of component utility classes
- ✅ Focus and interaction states defined

---

## Phase 3: Core UI Components Migration

**Objective**: Update fundamental UI components to use Notion design tokens

> ✅ Completed 2025-11-07 — Core UI components aligned to Notion system (`Button`, `Card`, `Input`, `Select`, `StatusBadge`, `Avatar`, `Checkbox`, `Tag`).

### 3.1 Button Component (`src/components/ui/Button.tsx`)

**Changes**:
- Update variants to match Notion styles:
  - **Primary**: Dark background (`bg-gray-900`), white text, hover to `bg-gray-700`
  - **Secondary**: Transparent with hover background (`bg-gray-200`)
  - **Ghost**: Minimal style with subtle hover
  - **Destructive**: Pink emphasis (`bg-pink-500`)
- Update sizes: `sm`, `md` (default), `lg`
- Padding: ~8px × 16px (Notion spec)
- Border radius: `rounded-400` (6px)
- Font: 14px, weight 500
- Transitions: 200ms

### 3.2 Card Component (`src/components/ui/Card.tsx`)

**Changes**:
- Default variant: White background, subtle border (`border-border-regular`)
- Stat card variant: Gray background (`bg-gray-200`), 12px radius, centered content
- Feature card variant: White with border, 12px radius
- Minimal elevation, softened hover translate
- Padding options: `p-6` (24px), `p-8` (32px), `p-12` (48px) with variant defaults

### 3.3 Input Component (`src/components/ui/Input.tsx`)

**Changes**:
- Border: `border-notion-borPri` (subtle gray)
- Focus state: Blue highlight (`border-blue-600`) + focus ring
- Font size: 14px body copy
- Padding: 8px × 12px
- Border radius: `rounded-400` (6px)
- Placeholder: `text-gray-500`

### 3.4 Select Component (`src/components/ui/Select.tsx`)

**Changes**:
- Matches Input styling for consistency
- Custom dropdown chevron icon
- Hover state: `hover:border-gray-400`
- Focus: Blue ring treatment

### 3.5 Status Badge Component (`src/components/ui/StatusBadge.tsx`)

**Changes**:
- Renamed legacy `Badge` to `StatusBadge`
- Status variants:
  - **Done**: `bg-green-100` / `text-green-500`
  - **In Progress**: `bg-blue-100` / `text-blue-700`
  - **Not Started**: `bg-notion-bacSec` / `text-notion-texSec`
  - **Blocked**: `bg-pink-100` / `text-pink-500`
- Padding: 3px × 8px
- Font: 13px, weight 500
- Border radius: `rounded-300` (5px)
- Backwards-compatible aliases (`primary`, `success`, `warning`, `error`, `neutral`)

### 3.6 New Components

#### Avatar Component (`src/components/ui/Avatar.tsx`)
```tsx
// Circular avatar with initials
// Size: 20px × 20px
// Background: tone variants (default blue-600)
// Text: 10px, weight 600, white
```

#### Checkbox Component (`src/components/ui/Checkbox.tsx`)
```tsx
// Custom Notion-style checkbox
// Size: 16px × 16px
// Border: uses Notion border token
// Checked: Blue background with white checkmark
```

#### Tag Component (`src/components/ui/Tag.tsx`)
```tsx
// Multi-select tag component
// Variants: blue, green, purple, pink
// Padding: 2px × 8px
// Font: 12px, weight 500
```

**Deliverables**:
- ✅ Updated Button.tsx
- ✅ Updated Card.tsx
- ✅ Updated Input.tsx
- ✅ Updated Select.tsx
- ✅ StatusBadge.tsx added (Badge alias retained for compatibility)
- ✅ New Avatar.tsx component
- ✅ New Checkbox.tsx component
- ✅ New Tag.tsx component

---

## Phase 4: Table Components (High Priority)

**Objective**: Create comprehensive Notion-style table system

### 4.1 NotionTable Component System

Create new table components:

#### `src/components/ui/NotionTable/NotionTable.tsx`
- Main table wrapper with white background, subtle border, 8px radius
- Horizontal scroll support and responsive padding

#### `src/components/ui/NotionTable/NotionTableHeader.tsx`
- Table title/action region with Notion button styling
- Supports primary/secondary action slots

#### `src/components/ui/NotionTable/NotionTableRow.tsx`
- Row wrapper with hover state and compact spacing controls

#### `src/components/ui/NotionTable/NotionTableCell.tsx`
- Typed cell components for text, status, tags, avatars, dates, actions, checkbox

### 4.2 Table Styling Specifications

```css
.notion-table-wrapper {
  @apply w-full bg-white rounded-500 p-6 border border-notion-borPri;
  @apply overflow-x-auto;
}

.notion-database {
  @apply w-full;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}

.notion-database thead {
  @apply sticky top-0 z-10 bg-white;
}

.notion-database th {
  @apply text-left px-3 py-2 font-semibold text-xs;
  @apply text-notion-texSec bg-notion-bacSec;
  @apply border-b border-notion-borPri;
  user-select: none;
  white-space: nowrap;
}

.notion-database tbody tr {
  @apply transition-all duration-150 cursor-pointer;
}

.notion-database tbody tr:hover {
  @apply bg-notion-bacHov;
}

.notion-database td {
  @apply px-3 py-2.5 border-b border-notion-borPri;
  @apply text-notion-texPri align-middle;
}
```

### 4.3 Update Existing Table Usage

Migrate existing tables to Notion style:

- **Observations list table** (`/observations`)
- **Audit list table** (`/audits`)
- **Checklist tables** (`/checklists`)
- **Plant list table** (`/plants`)
- **User management table** (`/admin/users`)

**Deliverables**:
- ✅ NotionTable component system
- ✅ NotionTableHeader component
- ✅ NotionTableRow component
- ✅ NotionTableCell component
- ✅ Updated all existing tables
- ✅ Pages updated: `plants`, `audits`, `observations`, `reports`, `admin/import`

---

## Phase 5: Layout Components

**Objective**: Update navigation and layout components

> ✅ Completed 2025-11-07 — NavBar and dashboard layout updated to Notion spacing, typography, and interaction patterns.

### 5.1 NavBar Component (`src/components/NavBar.tsx`)

**Changes**:
- Fixed header: 60px height
- Backdrop blur: `backdrop-filter: blur(10px)`
- Background: `rgba(255, 255, 255, 0.98)`
- Border bottom: 1px solid `border-notion-borPri`
- Navigation links:
  - Font: 14px, weight 500
  - Color: `text-notion-texSec`
  - Hover: `text-gray-900`
  - Transition: 200ms
- Responsive padding: uses `--base-padding`

### 5.2 DashboardContent Component

**Changes**:
- Update stat cards to Notion style
- Grid layout with proper gaps (20px)
- Responsive breakpoints aligned with Notion system
- Update charts and metrics display

**Deliverables**:
- ✅ Updated NavBar.tsx
- ✅ Updated DashboardContent.tsx

---

## Phase 6: Page-by-Page Migration

**Objective**: Update all application pages to use new design system

### 6.1 Authentication Pages

#### `/login` (`src/app/(auth)/login/page.tsx`)
- ✅ Updated 2025-11-07 — Notion-styled hero, feature card, success/error messaging.
- Update form with new Input component
- Update buttons with Notion primary/secondary styles
- Add proper spacing and typography hierarchy
- Card background with subtle border

#### `/accept-invite` (`src/app/(auth)/accept-invite/page.tsx`)
- ✅ Updated 2025-11-07 — Notion layout, token helper text, refined error state.
- Update invitation UI
- Use Notion card styles
- Update form inputs and buttons

### 6.2 Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)

- ✅ Updated 2025-11-07 — Dashboard route renders Notion cards with shared layout.
- Update stat cards to Notion style (gray background, large numbers)
- Update welcome section with proper typography
- Update quick actions with Notion buttons
- Add proper spacing between sections
- Use Notion color palette for charts/metrics

### 6.3 Plants Page (`src/app/(dashboard)/plants/page.tsx`)

- ✅ Updated 2025-11-07 — Feature card creation flow and Notion table layout.
- Update table to NotionTable component
- Add status badges for plant status
- Update action buttons
- Add tags for plant categories
- Proper hover states and interactions

### 6.4 Audits Pages

#### `/audits` (list view)
- ✅ Updated 2025-11-07 — Notion-feature creation card and table refresh.
- Convert to NotionTable
- Add status badges (Done, In Progress, Not Started)
- Add tags for audit types
- Add avatars for assignees
- Update filters and sort buttons

#### `/audits/[auditId]` (detail view)
- ✅ Updated 2025-11-07 — Detail and assignment sections restyled with Notion components.
- Update card layouts
- Update forms with new Input components
- Add proper sections with Notion spacing
- Update checklist display

### 6.5 Observations Pages

#### `/observations` (list view)
- ✅ Updated 2025-11-07 — Filters, creation workflow, and results table aligned to Notion components.
- Convert to NotionTable
- Add status badges for approval status
- Add priority indicators
- Add tags for observation categories
- Add avatars for auditors/auditees
- Update filters with Notion button styles

#### `/observations/[id]` (detail view)
- ✅ Updated 2025-11-07 — Header, forms, and alerts converted to Notion styling.
- Update observation form with new components
- Add proper card sections
- Update attachment display
- Add status badge prominently
- Update running notes section
- Add proper visual hierarchy

### 6.6 Checklists Page (`src/app/(dashboard)/checklists/page.tsx`)

- Convert to NotionTable
- Add custom Notion checkboxes
- Add progress indicators
- Update action buttons
- Add proper spacing

### 6.7 Reports Page (`src/app/(dashboard)/reports/page.tsx`)

- ✅ Updated 2025-11-07 — Overdue/due-soon tables and cards using Notion layout.
- Update report cards with Notion style
- Update typography hierarchy
- Add proper spacing between sections
- Update export buttons

### 6.8 Admin Pages

#### `/admin/users`
- ✅ Updated 2025-11-07 — Invitation workflow uses Notion feature card and success banner.
- Convert user table to NotionTable
- Add role badges
- Add avatars
- Update action buttons

#### `/admin/import`
- ✅ Updated 2025-11-07 — Notion feature cards framing template links and uploader.
- Update import UI
- Use Notion card styles
- Update buttons and inputs

### 6.9 AI Page (`src/app/(dashboard)/ai/page.tsx`)

- ✅ Updated 2025-11-07 — Notion-style layout for conversation list and chat pane.
- Update chat interface with Notion styling
- Update message bubbles (proper borders, spacing)
- Update input area
- Add proper typography

**Deliverables**:
- ✅ All authentication pages updated
- ✅ Dashboard page updated
- ✅ All data management pages updated (plants, audits, observations, checklists)
- ✅ Reports page updated
- ✅ Admin pages updated
- ✅ AI page updated

---

## Phase 7: Fine-Tuning & Polish

**Objective**: Ensure quality, accessibility, and consistency

### 7.1 Accessibility Audit

- **Color Contrast**: Verify all text meets WCAG 2.1 Level AA (4.5:1 for regular text, 3:1 for large text)
- **Focus Indicators**: Ensure all interactive elements have visible focus states
- **Keyboard Navigation**: Test tab order and keyboard shortcuts
- **Screen Reader**: Test with VoiceOver/NVDA for proper labels and announcements
- **ARIA Attributes**: Verify proper use of aria-label, aria-checked, etc.

### 7.2 Responsive Testing

- **Mobile (320px-767px)**: Test all pages, ensure tables scroll horizontally
- **Tablet (768px-1023px)**: Test grid layouts and spacing
- **Desktop (1024px+)**: Test max-width containers and large screens
- **Breakpoints**: Verify Notion spacing scales properly across breakpoints

### 7.3 Animation Polish

- **Consistency**: Verify all transitions use 150ms/200ms timing
- **Hover States**: Ensure smooth transitions on all interactive elements
- **Loading States**: Add skeleton loaders where appropriate
- **Micro-interactions**: Button press feedback, input focus animations

### 7.4 Cross-Browser Testing

- **Chrome**: Primary testing browser
- **Firefox**: Test for rendering differences
- **Safari**: Test webkit-specific issues (backdrop-filter, etc.)
- **Edge**: Ensure compatibility

### 7.5 Performance Optimization

- **Bundle Size**: Ensure Tailwind purging works correctly
- **Font Loading**: Verify Inter font loads efficiently
- **Image Optimization**: Ensure proper Next.js image optimization
- **Lighthouse Score**: Aim for 90+ on Performance, Accessibility, Best Practices

### 7.6 Documentation

- **Component Storybook**: Create examples of all components
- **Usage Guidelines**: Document when to use each component variant
- **Design Token Reference**: Create quick reference for developers
- **Migration Notes**: Document any breaking changes

**Deliverables**:
- ✅ Accessibility audit completed with WCAG AA compliance
- ✅ Responsive testing completed across all breakpoints
- ✅ Animation consistency verified
- ✅ Cross-browser testing completed
- ✅ Performance optimized (Lighthouse 90+)
- ✅ Documentation updated

---

## Implementation Order

1. ✅ **Phase 1**: Tailwind config update (design tokens)
2. ✅ **Phase 2**: Global CSS updates
3. ✅ **Phase 3**: Core UI components (Button, Card, Input, Badge, Avatar, Checkbox, Tag)
4. ✅ **Phase 4**: Table system (NotionTable and related components)
5. ✅ **Phase 5**: Layout components (NavBar, Dashboard)
6. ✅ **Phase 6**: Page-by-page migration
   - Auth pages → Dashboard → Data management → Reports → Admin → AI
7. ✅ **Phase 7**: Final polish and testing

---

## Testing Strategy

### Unit Testing
- Test each updated component in isolation
- Verify prop variations work correctly
- Test accessibility features (keyboard navigation, ARIA)

### Integration Testing
- Test component combinations
- Verify table functionality with real data
- Test form submissions

### Visual Regression Testing
- Take screenshots before/after migration
- Compare side-by-side for consistency
- Verify responsive layouts

### User Acceptance Testing
- Test with actual users (if possible)
- Gather feedback on new design
- Iterate based on feedback

---

## Risk Mitigation

### Risks

1. **Breaking Changes**: Components may break with new styles
   - **Mitigation**: Incremental approach, test after each phase

2. **CSS Specificity Issues**: Tailwind classes may conflict
   - **Mitigation**: Use consistent class naming, avoid inline styles

3. **Performance Degradation**: More CSS may slow down app
   - **Mitigation**: Ensure Tailwind purging works, monitor bundle size

4. **Browser Compatibility**: Some Notion styles may not work everywhere
   - **Mitigation**: Test across browsers early, use fallbacks

5. **User Confusion**: Design changes may confuse existing users
   - **Mitigation**: Communicate changes, provide transition guide

### Rollback Plan

If critical issues arise:
1. Revert to previous commit on `main` branch
2. Create hotfix branch for urgent fixes
3. Resume migration on `ui-improvements` branch after fixes

---

## Success Metrics

### Quantitative
- [ ] 100% of components migrated to Notion design system
- [ ] WCAG AA compliance on accessibility audit
- [ ] Lighthouse score ≥ 90 on all metrics
- [ ] Zero console errors or warnings
- [ ] Page load time ≤ 2 seconds

### Qualitative
- [ ] Consistent visual design across all pages
- [ ] Improved user experience and clarity
- [ ] Easier to maintain and extend components
- [ ] Developer satisfaction with new system
- [ ] User feedback positive on new design

---

## Timeline Estimate

**Total Estimated Time**: 5-7 days (full-time work)

- **Phase 1**: 0.5 days - Design tokens
- **Phase 2**: 0.5 days - Global CSS
- **Phase 3**: 1.5 days - Core components
- **Phase 4**: 1 day - Table system
- **Phase 5**: 0.5 days - Layout components
- **Phase 6**: 2-3 days - All pages
- **Phase 7**: 1 day - Polish and testing

---

## References

- [Notion Design System Style Guide](../docs/STYLE_GUIDE.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## Changelog

### 2025-11-07
- Initial migration plan created
- Phases defined
- Implementation order established

---

**Next Steps**: Review this plan, then proceed with Phase 1 implementation.
