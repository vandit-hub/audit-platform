# Notion-Inspired Design System - Style Guide

## Table of Contents
1. [Overview](#overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Component Styles](#component-styles)
6. [Shadows & Elevation](#shadows--elevation)
7. [Animations & Transitions](#animations--transitions)
8. [Border Radius](#border-radius)
9. [Opacity & Transparency](#opacity--transparency)
10. [Layout System](#layout-system)
11. [Interactive States](#interactive-states)
12. [Accessibility Considerations](#accessibility-considerations)
13. [Component Reference Code](#component-reference-code)

---

## Overview

This design system is inspired by Notion's clean, minimal, and functional aesthetic. It emphasizes:

- **Clarity**: Clear typography hierarchy and generous whitespace
- **Consistency**: Reusable components with predictable behavior
- **Flexibility**: Adaptive layouts that work across devices
- **Functionality**: Interactive elements that feel responsive and intuitive

### Design Philosophy
- Clean, minimal interface with subtle depth
- Typography-first approach with clear hierarchy
- Consistent spacing using an 8px grid system
- Muted color palette with purposeful accent colors
- Smooth, subtle animations that enhance UX without distraction

### Technology Stack
- Pure HTML/CSS (No frameworks)
- CSS Variables for theming
- Semantic HTML structure
- Responsive design (mobile-first approach)

---

## Color Palette

### Base Colors

#### Grayscale
The foundation of the design system uses a carefully crafted grayscale palette:

```css
--color-gray-100: #fcfbfb;  /* Lightest gray - subtle backgrounds */
--color-gray-200: #f6f5f4;  /* Light gray - card backgrounds, sections */
--color-gray-300: #dfdcd9;  /* Border gray - subtle dividers */
--color-gray-400: #a39e98;  /* Medium gray - disabled states */
--color-gray-500: #78736f;  /* Text gray - secondary text */
--color-gray-600: #615d59;  /* Dark gray - tertiary text */
--color-gray-700: #494744;  /* Darker gray - headings */
--color-gray-800: #31302e;  /* Very dark - primary elements */
--color-gray-900: #191918;  /* Darkest - primary text, high contrast */
```

**Usage Guidelines:**
- `gray-100` to `gray-200`: Background colors for sections and cards
- `gray-300`: Borders and subtle dividers
- `gray-400` to `gray-600`: Secondary and tertiary text, icons
- `gray-700` to `gray-900`: Primary text, headings, high-emphasis elements

#### Semantic Colors

```css
/* Page and Text */
--color-page: #ffffff;           /* Main background */
--color-text-dark: #191918;      /* Primary text */
--color-text-medium: #494744;    /* Secondary text */
--color-text-light: #78736f;     /* Tertiary text */

/* Notion-specific colors */
--c-bacPri: #ffffff;             /* Primary background */
--c-bacSec: #f7f6f3;             /* Secondary background */
--c-bacHov: #f1f0ee;             /* Hover state background */
--c-texPri: #37352f;             /* Primary text */
--c-texSec: #787774;             /* Secondary text */
--c-texTer: #9b9a97;             /* Tertiary text */
--c-borPri: rgba(0, 0, 0, 0.09); /* Primary border */
```

### Accent Colors

#### Blue (Primary Action)
```css
--c-palUiBlu600: #2383e2;                /* Primary blue - buttons, links */
--c-palUiBlu700: #105fad;                /* Darker blue - hover states */
--ca-palUiBlu100: rgba(35, 131, 226, 0.07);  /* Light blue bg - badges */
--ca-palUiBlu200: rgba(35, 131, 226, 0.14);  /* Blue tint */
```

**Usage:**
- Primary action buttons
- Links and interactive elements
- "In Progress" status indicators
- Selected states

#### Green (Success/Complete)
```css
--cd-palGre500: #448361;                  /* Primary green */
--cl-palGre100: rgba(123, 183, 129, 0.27);    /* Light green bg */
```

**Usage:**
- Success messages
- "Done" status badges
- Positive indicators
- Completion states

#### Pink/Red (Alert/Blocked)
```css
--cd-palPin500: #c14c8a;                  /* Primary pink */
--cl-palPin100: rgba(225, 136, 179, 0.27);    /* Light pink bg */
```

**Usage:**
- Error states
- "Blocked" status
- High priority indicators
- Alert messages

#### Purple (Secondary Accent)
```css
--cd-palPur500: #9065b0;                  /* Primary purple */
--cl-palPur100: rgba(168, 129, 197, 0.27);    /* Light purple bg */
```

**Usage:**
- Category tags
- Secondary actions
- Decorative accents

### Color Transparency System

```css
--border-color-regular: rgba(0, 0, 0, 0.08);   /* Standard borders */
--text-color-extra-light: rgba(0, 0, 0, 0.2);  /* Very subtle text */
--text-color-light: rgba(0, 0, 0, 0.4);        /* Light text */
--text-color-medium: rgba(0, 0, 0, 0.6);       /* Medium text */
```

### Color Usage Matrix

| Element | Primary | Hover | Active | Disabled |
|---------|---------|-------|--------|----------|
| **Button (Primary)** | `gray-900` | `gray-700` | `gray-800` | `gray-400` |
| **Button (Secondary)** | Transparent | `gray-200` | `gray-300` | `gray-200` |
| **Text (Primary)** | `gray-900` | - | - | `gray-400` |
| **Text (Secondary)** | `gray-500` | `gray-700` | - | `gray-400` |
| **Links** | `palUiBlu600` | `palUiBlu700` | `palUiBlu700` | `gray-400` |
| **Borders** | `gray-300` | `gray-400` | `palUiBlu600` | `gray-300` |

---

## Typography

### Font Family

The system uses a native font stack for optimal performance and native feel across platforms:

```css
--font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI",
                    Helvetica, "Apple Color Emoji", Arial, sans-serif,
                    "Segoe UI Emoji", "Segoe UI Symbol";
```

**Font Stack Breakdown:**
1. `-apple-system` - San Francisco on macOS/iOS
2. `BlinkMacSystemFont` - System font on Chrome
3. `Segoe UI` - Windows system font
4. `Helvetica` - Fallback for older systems
5. `Arial` - Universal fallback
6. Emoji fonts for proper rendering

### Font Rendering

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

These properties ensure crisp, smooth font rendering across browsers.

### Typography Scale

#### Display & Headings

```css
/* Section Title (h1) */
font-size: 48px;
font-weight: 700;
line-height: 1.1;
letter-spacing: -0.02em; /* Tight tracking for large text */

/* Heading (h2) */
font-size: 32px;
font-weight: 700;
line-height: 1.2;
margin: 0 0 16px 0;

/* Subheading (h3) */
font-size: 20px;
font-weight: 700;
line-height: 1.3;
margin: 0 0 12px 0;

/* Feature Title */
font-size: 18px;
font-weight: 700;
line-height: 1.4;
```

#### Body Text

```css
/* Section Subtitle (Large Body) */
font-size: 20px;
font-weight: 400;
line-height: 1.5;
color: var(--color-text-medium);

/* Body Text (Default) */
font-size: 18px;
font-weight: 400;
line-height: 1.6;
color: var(--color-text-medium);

/* Standard Body */
font-size: 16px;
font-weight: 400;
line-height: 1.5;
color: var(--color-text-medium);

/* Small Body */
font-size: 15px;
font-weight: 400;
line-height: 1.5;
color: var(--color-text-medium);
```

#### UI Text

```css
/* Eyebrow/Label */
font-size: 14px;
font-weight: 600;
line-height: 1.4;
text-transform: uppercase;
letter-spacing: 0.5px;
color: var(--color-text-medium);

/* Button Text */
font-size: 14px;
font-weight: 500;
line-height: 1;

/* Table Header */
font-size: 12px;
font-weight: 600;
line-height: 1.4;
color: var(--c-texSec);

/* Caption/Small */
font-size: 14px;
font-weight: 400;
line-height: 1.4;
color: var(--c-texSec);
```

#### Stat Display

```css
/* Large Number Display */
font-size: 64px;
font-weight: 700;
line-height: 1;
letter-spacing: -0.02em;

/* Responsive (Mobile) */
@media (max-width: 768px) {
  font-size: 48px;
}
```

### Font Weight Usage

| Weight | Value | Usage |
|--------|-------|-------|
| **Regular** | 400 | Body text, descriptions, paragraphs |
| **Medium** | 500 | Buttons, emphasized text, navigation |
| **Semibold** | 600 | Subheadings, labels, table headers |
| **Bold** | 700 | Headings, titles, numbers, important text |

### Line Height Guidelines

| Element | Line Height | Reasoning |
|---------|-------------|-----------|
| **Display Text (48px+)** | 1.1 | Tight for impact |
| **Headings (20-32px)** | 1.2-1.3 | Balanced readability |
| **Body Text (16-18px)** | 1.5-1.6 | Comfortable reading |
| **UI Text (12-14px)** | 1.4 | Compact but legible |
| **Buttons** | 1 | Vertically centered |

### Typography Hierarchy Example

```html
<!-- Page Title -->
<h1 class="section-title">All-in-one AI, right where you work.</h1>

<!-- Section Eyebrow -->
<div class="section-eyebrow">Notion for Enterprise</div>

<!-- Section Title -->
<h2 class="section-title">Knowledge and work. Connected.</h2>

<!-- Subtitle -->
<p class="section-subtitle">One secure AI workspace where enterprise teams plan...</p>

<!-- Feature Title -->
<h3>AI with all the right context</h3>

<!-- Body Text -->
<p>Not just another generic AI tool—it's AI powered by your team's knowledge...</p>
```

---

## Spacing System

The design uses an 8px base grid for consistent spacing throughout:

### Base Spacing Variables

```css
--base-padding: 20px;           /* Base padding (responsive) */
--spacing-xs: 20px;             /* Extra small spacing */
--spacing-s: 40px;              /* Small spacing */
--spacing-m: 40px;              /* Medium spacing (responsive) */
--spacing-l: 60px;              /* Large spacing (responsive) */
--spacing-xl: 60px;             /* Extra large spacing (responsive) */
--header-height: 60px;          /* Fixed header height */
```

### Responsive Spacing

```css
/* Mobile (Default) */
--base-padding: 20px;
--spacing-m: 40px;
--spacing-l: 60px;
--spacing-xl: 60px;

/* Tablet (600px+) */
@media (min-width: 600px) {
  --base-padding: 40px;
  --spacing-l: 80px;
  --spacing-xl: 80px;
}

/* Desktop (1080px+) */
@media (min-width: 1080px) {
  --base-padding: 60px;
}

/* Large Desktop (1440px+) */
@media (min-width: 1440px) {
  --spacing-m: 60px;
  --spacing-l: 120px;
  --spacing-xl: 160px;
}
```

### Component Spacing

#### Cards & Containers
```css
/* Stat Card */
padding: 48px 32px;

/* Feature Card */
padding: 32px;

/* Security Card */
padding: 32px;

/* Table Wrapper */
padding: 24px;

/* Table Wrapper (Mobile) */
@media (max-width: 768px) {
  padding: 16px;
}
```

#### Buttons
```css
/* Primary/Secondary Button */
padding: 8px 16px;

/* Table Action Button */
padding: 6px 12px;
```

#### Tables
```css
/* Table Header Cell */
padding: 8px 12px;

/* Table Data Cell */
padding: 10px 12px;

/* Mobile Table Cells */
@media (max-width: 768px) {
  padding: 8px;
}
```

#### Feature Items
```css
/* Feature Item */
padding: 16px;
gap: 12px;
```

#### Status Badges & Tags
```css
/* Status Badge */
padding: 3px 8px;

/* Tag */
padding: 2px 8px;
```

### Gap System

```css
/* Navigation */
gap: 32px;  /* Between nav items */

/* Nav Buttons */
gap: 12px;  /* Between action buttons */

/* Feature List */
gap: 12px;  /* Between list items */

/* Tags */
gap: 6px;   /* Between tags */

/* Action Buttons */
gap: 8px;   /* Between table action buttons */

/* Person Info */
gap: 8px;   /* Between avatar and name */

/* Priority Indicator */
gap: 4px;   /* Between icon and text */
```

### Margin System

```css
/* Section Spacing */
section {
  padding: var(--spacing-xl) 0;  /* Top and bottom */
}

/* Hero Section */
.hero {
  padding-top: 80px;
}

/* Stats Grid */
margin-top: 60px;

/* Section Header */
margin-bottom: 60px;

/* Feature Sections */
margin-top: 80px;

/* Table */
margin: 40px 0;

/* Table Header */
margin-bottom: 16px;
padding-bottom: 12px;
```

### Spacing Scale Reference

| Token | Value (Mobile) | Value (Desktop) | Usage |
|-------|----------------|-----------------|-------|
| `spacing-xs` | 20px | 20px | Tight spacing, inline elements |
| `spacing-s` | 40px | 40px | Between related elements |
| `spacing-m` | 40px | 60px | Between component sections |
| `spacing-l` | 60px | 120px | Between major sections |
| `spacing-xl` | 60px | 160px | Between page sections |

---

## Component Styles

### Buttons

#### Primary Button
```css
.btn-primary {
  color: white;
  background: var(--color-text-dark);
  padding: 8px 16px;
  border-radius: var(--border-radius-400); /* 6px */
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--color-gray-700);
}
```

**Usage:** Primary actions, CTAs, form submissions

#### Secondary Button
```css
.btn-secondary {
  color: var(--color-text-dark);
  background: transparent;
  padding: 8px 16px;
  border-radius: var(--border-radius-400);
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--color-gray-200);
}
```

**Usage:** Secondary actions, cancel buttons, less prominent actions

#### Table Action Button
```css
.notion-table-btn {
  padding: 6px 12px;
  font-size: 14px;
  color: var(--c-texSec);
  background: transparent;
  border: 1px solid var(--c-borPri);
  border-radius: var(--border-radius-300);
  cursor: pointer;
  transition: all 0.15s;
}

.notion-table-btn:hover {
  background: var(--c-bacHov);
}
```

**Usage:** Table filters, sorts, inline actions

### Cards

#### Stat Card
```css
.stat-card {
  background: var(--color-gray-200);
  border-radius: var(--border-radius-700); /* 12px */
  padding: 48px 32px;
  text-align: center;
}
```

**Contains:**
- Large number display (64px, weight 700)
- Description text (16px, color medium)

#### Feature Card
```css
.feature-card {
  padding: 32px;
  background: white;
  border: 1px solid var(--border-color-regular);
  border-radius: var(--border-radius-700);
}
```

**Contains:**
- Title (20px, weight 700)
- Description (16px, color medium)

#### Security Card
```css
.security-card {
  padding: 32px;
  background: var(--color-gray-200);
  border-radius: var(--border-radius-700);
}
```

**Contains:**
- Title (18px, weight 700)
- Description (15px, color medium)

### Feature Items

```css
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: var(--border-radius-500); /* 8px */
  border: 1px solid var(--border-color-regular);
}
```

**Contains:**
- Icon container (24x24px, rounded)
- Content (title + optional description)

### Status Badges

```css
.notion-status {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--border-radius-300);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

/* Variants */
.status-done {
  background: var(--cl-palGre100);
  color: var(--cd-palGre500);
}

.status-in-progress {
  background: var(--ca-palUiBlu100);
  color: var(--c-palUiBlu700);
}

.status-not-started {
  background: var(--c-bacSec);
  color: var(--c-texSec);
}

.status-blocked {
  background: var(--cl-palPin100);
  color: var(--cd-palPin500);
}
```

### Tags

```css
.notion-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--border-radius-300);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* Color Variants */
.tag-blue {
  background: var(--ca-palUiBlu100);
  color: var(--c-palUiBlu700);
}

.tag-green {
  background: var(--cl-palGre100);
  color: var(--cd-palGre500);
}

.tag-purple {
  background: var(--cl-palPur100);
  color: var(--cd-palPur500);
}

.tag-pink {
  background: var(--cl-palPin100);
  color: var(--cd-palPin500);
}
```

### Avatars

```css
.notion-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--c-palUiBlu600);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
```

### Checkboxes

```css
.notion-checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--c-borPri);
  border-radius: var(--border-radius-200);
  cursor: pointer;
  appearance: none;
  transition: all 0.15s;
}

.notion-checkbox:checked {
  background: var(--c-palUiBlu600);
  border-color: var(--c-palUiBlu600);
  position: relative;
}

.notion-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: 700;
}
```

### Tables

#### Table Container
```css
.notion-table-wrapper {
  width: 100%;
  background: var(--c-bacPri);
  border-radius: var(--border-radius-500);
  padding: 24px;
  margin: 40px 0;
  border: 1px solid var(--c-borPri);
  overflow-x: auto;
}
```

#### Table Structure
```css
.notion-database {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}

.notion-database thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--c-bacPri);
}

.notion-database th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 12px;
  color: var(--c-texSec);
  border-bottom: 1px solid var(--c-borPri);
  background: var(--c-bacSec);
  user-select: none;
  white-space: nowrap;
}

.notion-database tbody tr {
  transition: background 0.15s;
  cursor: pointer;
}

.notion-database tbody tr:hover {
  background: var(--c-bacHov);
}

.notion-database td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--c-borPri);
  color: var(--c-texPri);
  vertical-align: middle;
}
```

### Navigation

```css
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height); /* 60px */
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color-regular);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 var(--base-padding);
}

nav a {
  color: var(--color-text-medium);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

nav a:hover {
  color: var(--color-text-dark);
}
```

---

## Shadows & Elevation

This design system uses minimal shadows, preferring borders and subtle backgrounds for depth.

### Shadow Usage

The system intentionally avoids heavy drop shadows in favor of:
1. **Borders**: `1px solid var(--border-color-regular)`
2. **Background Color Contrast**: Different grays for depth
3. **Backdrop Blur**: For the header navigation

### Header Backdrop
```css
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.98);
```

**Effect:** Creates a frosted glass effect while maintaining legibility

### When to Add Shadows (Future Extensions)

If you need to add elevation, use this scale:

```css
/* Level 1 - Subtle */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

/* Level 2 - Raised */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);

/* Level 3 - Floating */
box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);

/* Level 4 - Modal */
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);

/* Level 5 - Dropdown */
box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
```

---

## Animations & Transitions

### Transition Timing

The system uses consistent timing for smooth interactions:

```css
/* Standard Transitions */
transition: all 0.2s;        /* Buttons, links, general UI */
transition: all 0.15s;       /* Quick hover states, table rows */
transition: color 0.2s;      /* Text color changes */
transition: background 0.15s; /* Background changes */
transition: opacity 0.2s;    /* Opacity fades */
```

### Timing Guidelines

| Duration | Usage |
|----------|-------|
| **0.15s** | Quick feedback - hover states, table rows |
| **0.2s** | Standard interactions - buttons, links |
| **0.3s** | Slower animations - modals, drawers (if added) |

### Easing
All transitions use the default `ease` timing function for natural movement.

### Hover Transitions

#### Buttons
```css
.btn {
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--color-gray-700);
}

.btn-secondary:hover {
  background: var(--color-gray-200);
}
```

#### Links
```css
nav a {
  transition: color 0.2s;
}

nav a:hover {
  color: var(--color-text-dark);
}

a.link {
  transition: opacity 0.2s;
}

a.link:hover {
  opacity: 0.6;
}
```

#### Table Rows
```css
.notion-database tbody tr {
  transition: background 0.15s;
}

.notion-database tbody tr:hover {
  background: var(--c-bacHov);
}
```

#### Checkboxes
```css
.notion-checkbox {
  transition: all 0.15s;
}
```

### Scroll Behavior
```css
html {
  scroll-behavior: smooth;
}
```

**Effect:** Smooth scrolling for anchor links

---

## Border Radius

The system uses a consistent border radius scale:

### Radius Scale

```css
--border-radius-200: 0.25rem;    /* 4px - Small elements */
--border-radius-300: 0.3125rem;  /* 5px - Tags, badges */
--border-radius-400: 0.375rem;   /* 6px - Buttons, inputs */
--border-radius-500: 0.5rem;     /* 8px - Cards, tables */
--border-radius-600: 0.625rem;   /* 10px - (Reserved) */
--border-radius-700: 0.75rem;    /* 12px - Large cards */
--border-radius-round: 624.9375rem; /* 9999px - Circular elements */
```

### Usage by Component

| Component | Radius | Value |
|-----------|--------|-------|
| **Checkbox** | 200 | 4px |
| **Tags, Status Badges** | 300 | 5px |
| **Buttons, Table Actions** | 400 | 6px |
| **Feature Items, Tables** | 500 | 8px |
| **Large Cards, Sections** | 700 | 12px |
| **Avatars, Circular Icons** | round | 50% or 9999px |

### Application Examples

```css
/* Small - Checkboxes */
.notion-checkbox {
  border-radius: var(--border-radius-200);
}

/* Medium - Tags */
.notion-tag {
  border-radius: var(--border-radius-300);
}

/* Standard - Buttons */
.btn {
  border-radius: var(--border-radius-400);
}

/* Large - Cards */
.stat-card {
  border-radius: var(--border-radius-700);
}

/* Circular - Avatars */
.notion-avatar {
  border-radius: 50%;
}
```

---

## Opacity & Transparency

### Background Transparency

```css
/* Header backdrop */
background: rgba(255, 255, 255, 0.98); /* 98% white */

/* Status badge backgrounds */
--ca-palUiBlu100: rgba(35, 131, 226, 0.07);  /* 7% blue */
--ca-palUiBlu200: rgba(35, 131, 226, 0.14);  /* 14% blue */
--cl-palGre100: rgba(123, 183, 129, 0.27);   /* 27% green */
--cl-palPin100: rgba(225, 136, 179, 0.27);   /* 27% pink */
--cl-palPur100: rgba(168, 129, 197, 0.27);   /* 27% purple */
```

### Border & Text Transparency

```css
/* Borders */
--border-color-regular: rgba(0, 0, 0, 0.08);  /* 8% black */
--c-borPri: rgba(0, 0, 0, 0.09);              /* 9% black */

/* Text */
--text-color-extra-light: rgba(0, 0, 0, 0.2); /* 20% black */
--text-color-light: rgba(0, 0, 0, 0.4);       /* 40% black */
--text-color-medium: rgba(0, 0, 0, 0.6);      /* 60% black */
```

### Selection Highlight

```css
::selection {
  background: rgba(35, 131, 226, 0.28); /* 28% blue */
}
```

### Hover State Transparency

```css
/* Link hover */
a.link:hover {
  opacity: 0.6; /* 60% opacity */
}

/* Company logos */
.company-logo {
  opacity: 0.7; /* 70% opacity */
}
```

### Transparency Usage Guidelines

| Opacity | Usage |
|---------|-------|
| **98%** | Translucent backgrounds (header) |
| **70%** | Muted elements (logos, disabled states) |
| **60%** | Hover opacity reduction |
| **40%** | Light text |
| **27%** | Colored badge backgrounds |
| **20%** | Extra light text |
| **14%** | Subtle colored backgrounds |
| **8-9%** | Border colors |
| **7%** | Very subtle backgrounds |

---

## Layout System

### Container System

```css
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--base-padding);
}
```

**Behavior:**
- Centers content
- Max width of 1440px
- Responsive padding (20px → 40px → 60px)

### Grid Systems

#### Stats Grid
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
}

/* Mobile */
@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

#### Feature Cards Grid
```css
.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}
```

#### Security Grid
```css
.security-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
```

#### Two Column Layout
```css
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

@media (max-width: 900px) {
  .two-column {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
```

### Flexbox Patterns

#### Header Layout
```css
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

#### Navigation
```css
nav {
  display: flex;
  align-items: center;
  gap: 32px;
}
```

#### Feature Items
```css
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
```

#### Tags Container
```css
.notion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

### Responsive Breakpoints

```css
/* Mobile First Approach */

/* Tablet: 600px */
@media (min-width: 600px) {
  --base-padding: 40px;
  --spacing-l: 80px;
  --spacing-xl: 80px;
}

/* Desktop: 1080px */
@media (min-width: 1080px) {
  --base-padding: 60px;
}

/* Large Desktop: 1440px */
@media (min-width: 1440px) {
  --spacing-m: 60px;
  --spacing-l: 120px;
  --spacing-xl: 160px;
}

/* Mobile Adjustments: 768px and below */
@media (max-width: 768px) {
  nav { display: none; }
  .section-title { font-size: 36px; }
  .stat-number { font-size: 48px; }
  .stats-grid { grid-template-columns: 1fr; }
}

/* Two Column Breakpoint: 900px */
@media (max-width: 900px) {
  .two-column {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
```

---

## Interactive States

### Button States

#### Primary Button
```css
/* Default */
background: var(--color-text-dark);
color: white;

/* Hover */
background: var(--color-gray-700);

/* Active */
background: var(--color-gray-800);

/* Focus */
outline: 2px solid var(--c-palUiBlu600);
outline-offset: 2px;

/* Disabled */
background: var(--color-gray-400);
cursor: not-allowed;
opacity: 0.6;
```

#### Secondary Button
```css
/* Default */
background: transparent;
color: var(--color-text-dark);

/* Hover */
background: var(--color-gray-200);

/* Active */
background: var(--color-gray-300);
```

### Link States

```css
/* Default */
color: var(--color-text-dark);
border-bottom: 1px solid var(--color-text-dark);

/* Hover */
opacity: 0.6;

/* Visited */
/* No special styling - maintains consistency */

/* Focus */
outline: 2px solid var(--c-palUiBlu600);
outline-offset: 2px;
```

### Table Row States

```css
/* Default */
background: transparent;

/* Hover */
background: var(--c-bacHov);
cursor: pointer;

/* Selected (if implemented) */
background: var(--ca-palUiBlu100);
```

### Checkbox States

```css
/* Unchecked */
border: 1.5px solid var(--c-borPri);
background: transparent;

/* Checked */
background: var(--c-palUiBlu600);
border-color: var(--c-palUiBlu600);

/* Hover */
border-color: var(--c-palUiBlu600);

/* Disabled */
border-color: var(--color-gray-400);
cursor: not-allowed;
opacity: 0.5;
```

### Status States

| Status | Background | Text Color | Usage |
|--------|------------|------------|-------|
| **Done** | `cl-palGre100` | `cd-palGre500` | Completed tasks |
| **In Progress** | `ca-palUiBlu100` | `c-palUiBlu700` | Active tasks |
| **Not Started** | `c-bacSec` | `c-texSec` | Pending tasks |
| **Blocked** | `cl-palPin100` | `cd-palPin500` | Blocked tasks |

---

## Accessibility Considerations

### Color Contrast

All text meets WCAG 2.1 Level AA standards:
- Large text (18px+): 3:1 minimum contrast
- Regular text: 4.5:1 minimum contrast

### Focus States

All interactive elements should have visible focus indicators:

```css
*:focus {
  outline: 2px solid var(--c-palUiBlu600);
  outline-offset: 2px;
}

/* Override browser defaults */
*, :focus {
  outline: 0;
}
```

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<button>` for actions, `<a>` for navigation
- Use `<table>` with proper `<thead>`, `<tbody>`, `<th>`, `<td>`
- Use semantic sectioning: `<header>`, `<nav>`, `<main>`, `<section>`

### Screen Reader Considerations

```html
<!-- Use aria-label for icon-only buttons -->
<button aria-label="Filter table">⚡</button>

<!-- Use aria-checked for custom checkboxes -->
<input type="checkbox" aria-checked="true">

<!-- Use aria-label for status badges -->
<span class="notion-status status-done" aria-label="Status: Done">Done</span>

<!-- Use proper table headers -->
<th scope="col">Task</th>
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Tab order should follow visual flow
- Enter/Space should activate buttons
- Esc should close modals/dropdowns

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## CSS Framework Usage

### Framework Status
This project uses **pure CSS** with **CSS Variables** for theming. No CSS frameworks (Tailwind, Bootstrap, etc.) are used.

### Why Not Tailwind?

While Tailwind CSS is popular, this design system uses vanilla CSS for:
1. **Full Control**: Custom properties and exact specifications
2. **Performance**: No framework overhead
3. **Learning**: Understanding fundamental CSS
4. **Maintainability**: Clear, semantic class names

### CSS Variables as a System

The design system uses CSS variables (custom properties) as a theming system:

```css
:root {
  /* Define once */
  --color-text-dark: #191918;
  --spacing-m: 40px;
}

/* Use everywhere */
.element {
  color: var(--color-text-dark);
  margin: var(--spacing-m);
}
```

**Benefits:**
- Centralized values
- Runtime updates
- Cascade support
- Responsive values

### Converting to Tailwind (If Needed)

If you need to migrate to Tailwind, here's the mapping:

| Custom Class | Tailwind Equivalent |
|--------------|---------------------|
| `.btn-primary` | `bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700` |
| `.btn-secondary` | `bg-transparent hover:bg-gray-200 px-4 py-2 rounded-md` |
| `.section-title` | `text-5xl font-bold leading-tight` |
| `.container` | `max-w-7xl mx-auto px-4` |
| `.two-column` | `grid grid-cols-1 md:grid-cols-2 gap-16` |

---

## Component Reference Code

### 1. Primary Button

```html
<a href="#signup" class="btn btn-primary">Get Notion free</a>
```

```css
.btn {
  padding: 8px 16px;
  border-radius: var(--border-radius-400);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  display: inline-block;
}

.btn-primary {
  color: white;
  background: var(--color-text-dark);
}

.btn-primary:hover {
  background: var(--color-gray-700);
}
```

---

### 2. Stat Card

```html
<div class="stat-card">
  <div class="stat-number">98%</div>
  <div class="stat-description">of Forbes Cloud 100 teams<br>use Notion</div>
</div>
```

```css
.stat-card {
  background: var(--color-gray-200);
  border-radius: var(--border-radius-700);
  padding: 48px 32px;
  text-align: center;
}

.stat-number {
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 12px;
}

.stat-description {
  font-size: 16px;
  color: var(--color-text-medium);
  line-height: 1.4;
}
```

---

### 3. Feature Item with Icon

```html
<div class="feature-item">
  <div class="feature-icon">🔍</div>
  <div class="feature-item-content">
    <h4>Enterprise Search</h4>
  </div>
</div>
```

```css
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: var(--border-radius-500);
  border: 1px solid var(--border-color-regular);
}

.feature-icon {
  width: 24px;
  height: 24px;
  background: var(--color-text-dark);
  border-radius: var(--border-radius-400);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.feature-item-content h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
```

---

### 4. Status Badge

```html
<!-- Done Status -->
<span class="notion-status status-done">Done</span>

<!-- In Progress -->
<span class="notion-status status-in-progress">In Progress</span>

<!-- Not Started -->
<span class="notion-status status-not-started">Not Started</span>

<!-- Blocked -->
<span class="notion-status status-blocked">Blocked</span>
```

```css
.notion-status {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--border-radius-300);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.notion-status.status-done {
  background: var(--cl-palGre100);
  color: var(--cd-palGre500);
}

.notion-status.status-in-progress {
  background: var(--ca-palUiBlu100);
  color: var(--c-palUiBlu700);
}

.notion-status.status-not-started {
  background: var(--c-bacSec);
  color: var(--c-texSec);
}

.notion-status.status-blocked {
  background: var(--cl-palPin100);
  color: var(--cd-palPin500);
}
```

---

### 5. Tags/Multi-select

```html
<div class="notion-tags">
  <span class="notion-tag tag-blue">Design</span>
  <span class="notion-tag tag-purple">UI/UX</span>
  <span class="notion-tag tag-green">Engineering</span>
</div>
```

```css
.notion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.notion-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--border-radius-300);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.notion-tag.tag-blue {
  background: var(--ca-palUiBlu100);
  color: var(--c-palUiBlu700);
}

.notion-tag.tag-green {
  background: var(--cl-palGre100);
  color: var(--cd-palGre500);
}

.notion-tag.tag-purple {
  background: var(--cl-palPur100);
  color: var(--cd-palPur500);
}

.notion-tag.tag-pink {
  background: var(--cl-palPin100);
  color: var(--cd-palPin500);
}
```

---

### 6. Person with Avatar

```html
<div class="notion-person">
  <div class="notion-avatar">JS</div>
  <span>Jane Smith</span>
</div>
```

```css
.notion-person {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notion-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--c-palUiBlu600);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Custom avatar colors */
.notion-avatar[style*="background: #9065b0"] {
  /* Purple avatar */
}
```

---

### 7. Custom Checkbox

```html
<input type="checkbox" class="notion-checkbox" checked>
```

```css
.notion-checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--c-borPri);
  border-radius: var(--border-radius-200);
  cursor: pointer;
  appearance: none;
  transition: all 0.15s;
}

.notion-checkbox:checked {
  background: var(--c-palUiBlu600);
  border-color: var(--c-palUiBlu600);
  position: relative;
}

.notion-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: 700;
}
```

---

### 8. Complete Table Example

```html
<div class="notion-table-wrapper">
  <div class="notion-table-header">
    <div class="notion-table-title">Product Roadmap Q1 2025</div>
    <div class="notion-table-actions">
      <button class="notion-table-btn">Filter</button>
      <button class="notion-table-btn">Sort</button>
      <button class="notion-table-btn">+ New</button>
    </div>
  </div>

  <table class="notion-database">
    <thead>
      <tr>
        <th class="notion-cell-checkbox"></th>
        <th>Task</th>
        <th>Status</th>
        <th>Priority</th>
        <th>Assignee</th>
        <th>Tags</th>
        <th>Due Date</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="notion-cell-checkbox">
          <input type="checkbox" class="notion-checkbox" checked>
        </td>
        <td><strong>Design new dashboard UI</strong></td>
        <td>
          <span class="notion-status status-done">Done</span>
        </td>
        <td>
          <span class="notion-priority priority-high">High</span>
        </td>
        <td>
          <div class="notion-person">
            <div class="notion-avatar">JS</div>
            <span>Jane Smith</span>
          </div>
        </td>
        <td>
          <div class="notion-tags">
            <span class="notion-tag tag-blue">Design</span>
            <span class="notion-tag tag-purple">UI/UX</span>
          </div>
        </td>
        <td><span class="notion-date">Jan 15, 2025</span></td>
      </tr>
      <!-- More rows... -->
    </tbody>
  </table>
</div>
```

**CSS:** See Component Styles > Tables section

---

### 9. Section Header Pattern

```html
<div class="section-header">
  <div class="section-eyebrow">Notion for Enterprise</div>
  <h2 class="section-title">Knowledge and<br>work. Connected.</h2>
  <p class="section-subtitle">One secure AI workspace where enterprise teams plan, collaborate, and build faster together.</p>
  <div style="margin-top: 24px;">
    <a href="#" class="btn btn-primary">Request a demo</a>
  </div>
</div>
```

```css
.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-eyebrow {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-medium);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-title {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.1;
  margin: 0 0 16px 0;
}

.section-subtitle {
  font-size: 20px;
  color: var(--color-text-medium);
  line-height: 1.5;
  max-width: 700px;
  margin: 0 auto;
}
```

---

### 10. Two Column Feature Layout

```html
<div class="two-column">
  <div class="feature-content">
    <div class="section-eyebrow">Customizable</div>
    <h3>Flexible design that grows with you.</h3>
    <p>Build a dynamic workspace that adapts and scales with your team's needs.</p>
  </div>
  <div class="feature-image">
    <div style="color: var(--color-text-light);">Visual placeholder</div>
  </div>
</div>
```

```css
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

@media (max-width: 900px) {
  .two-column {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

.feature-content h3 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.feature-content p {
  font-size: 18px;
  color: var(--color-text-medium);
  line-height: 1.6;
  margin: 0;
}

.feature-image {
  background: var(--color-gray-200);
  border-radius: var(--border-radius-700);
  padding: 40px;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Design Tokens Summary

### Quick Reference Table

| Category | Token | Value | Usage |
|----------|-------|-------|-------|
| **Color** | Primary Text | `#191918` | Headings, body text |
| | Secondary Text | `#494744` | Subtitles, captions |
| | Accent Blue | `#2383e2` | Buttons, links |
| | Background | `#ffffff` | Page background |
| | Background Alt | `#f6f5f4` | Cards, sections |
| **Spacing** | XS | `20px` | Tight spacing |
| | S | `40px` | Small spacing |
| | M | `40-60px` | Medium spacing |
| | L | `60-120px` | Large spacing |
| | XL | `60-160px` | Section spacing |
| **Typography** | Display | `48px / 700` | Page titles |
| | Heading | `32px / 700` | Section headings |
| | Subheading | `20px / 700` | Component titles |
| | Body Large | `18px / 400` | Feature descriptions |
| | Body | `16px / 400` | Standard text |
| | Small | `14px / 400` | Labels, UI text |
| **Radius** | Small | `4px` | Checkboxes |
| | Medium | `5-6px` | Tags, buttons |
| | Large | `8-12px` | Cards |
| | Round | `50%` | Avatars |
| **Transition** | Quick | `0.15s` | Hover states |
| | Standard | `0.2s` | Interactions |

---

## Best Practices

### When to Use Each Component

1. **Stat Card**: Highlight key metrics, numbers, achievements
2. **Feature Card**: Describe product features, services
3. **Security Card**: Technical specifications, compliance info
4. **Status Badge**: Task/project status in tables
5. **Tags**: Categories, labels, multi-select properties
6. **Tables**: Data organization, project management, lists

### Composition Guidelines

1. **Hierarchy**: Always use proper heading hierarchy (h1 → h2 → h3)
2. **Contrast**: Ensure sufficient color contrast for accessibility
3. **Spacing**: Use consistent spacing from the spacing scale
4. **Alignment**: Align related elements, use grids for structure
5. **Consistency**: Use the same patterns throughout your design

### Common Patterns

**Hero Section:**
```
Eyebrow → Title → Subtitle → CTA → Visual/Cards
```

**Feature Section:**
```
Section Header → Two Column (Content + Visual) → Supporting Elements
```

**Table Section:**
```
Section Header → Table Wrapper → Table Header → Table → Footer Actions
```

---

## Maintenance & Updates

### Adding New Colors

```css
:root {
  /* Add to appropriate section */
  --color-orange-500: #ff6d00;
  --ca-palOra100: rgba(255, 109, 0, 0.07);
}
```

### Adding New Components

1. Follow existing naming conventions
2. Use CSS variables for values
3. Add hover/focus states
4. Document in this guide

### Updating Spacing

Update base variables, responsive styles will adjust:

```css
:root {
  --spacing-m: 50px; /* Changed from 40px */
}
```

---

## Resources & Tools

### Color Tools
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Palette Generator](https://coolors.co/)

### Typography Tools
- [Type Scale Generator](https://type-scale.com/)
- [Font Pairing](https://fontpair.co/)

### Layout Tools
- [CSS Grid Generator](https://cssgrid-generator.netlify.app/)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

---

## Changelog

### Version 1.0.0 (Current)
- Initial design system documentation
- Notion-inspired components
- Table/database system
- Comprehensive spacing and typography scales
- Accessibility guidelines

---

**End of Style Guide**

For questions or contributions, please refer to the project repository or contact the design team.
