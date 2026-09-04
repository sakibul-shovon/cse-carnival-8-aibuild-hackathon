# CampusOS Frontend UI/UX Guide

This document serves as the official project-local frontend design and UX rulebook for CampusOS. Future AI coding agents and developers must read this file before creating or modifying UI.

## 1. Product Visual Philosophy

CampusOS is a premium university operating system. It should feel:
- **Modern & Intelligent:** Cutting edge without being an overwhelming "cyberpunk" cliché.
- **Trustworthy & Calm:** A single source of truth for students, prioritizing reliable, scannable information over visual noise.
- **Highly Usable & Fast:** Optimized for scanning schedules and fast actions.

**Avoid:**
- Generic admin templates or basic CRUD looks.
- Overly futuristic gaming interfaces.
- Unnecessary 3D effects, floating elements, rainbow gradients, or excessive glassmorphism.
- Raw database dumps for tables.

## 2. Design Principles & Tokens

The UI relies on semantic design tokens to maintain a consistent visual identity. Do not hardcode hex values into components. Use the following CSS variables.

### Color System (CSS Variables)

We use a sophisticated, academic yet modern palette. The following semantic tokens should be defined in the global stylesheet (`index.css` or equivalent):

```css
:root {
  /* Core Brand */
  --color-primary: #2563eb; /* A trustworthy, slightly vibrant blue */
  --color-primary-foreground: #ffffff;
  
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;

  /* Surfaces & Backgrounds */
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;

  /* Borders */
  --color-border: #e2e8f0;
  --color-border-subtle: #f1f5f9;

  /* Typography */
  --color-text: #0f172a;
  --color-text-muted: #475569;
  --color-text-subtle: #94a3b8;

  /* Status Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* AI Accent Colors */
  --color-ai: #8b5cf6; /* A distinct purple for intelligence features */
  --color-ai-surface: #f3e8ff;
  --color-ai-accent: #7c3aed;

  /* Domain Specific Colors */
  --color-schedule: #3b82f6;
  --color-room: #10b981;
  --color-event: #f59e0b;
  --color-announcement: #ef4444;
  --color-assignment: #8b5cf6;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #020617;
    --color-surface: #0f172a;
    --color-surface-elevated: #1e293b;
    --color-border: #334155;
    --color-border-subtle: #1e293b;
    --color-text: #f8fafc;
    --color-text-muted: #94a3b8;
    --color-text-subtle: #64748b;
    --color-ai-surface: #2e1065;
  }
}
```

### Typography System

Prioritize legibility and information density. Use a clean sans-serif like **Inter** or system fonts.

- **Display:** 2.5rem (40px) / Line Height 1.2 / Font Weight 700 - Page Titles
- **H1:** 2rem (32px) / Line Height 1.2 / Font Weight 700 - Major section headers
- **H2:** 1.5rem (24px) / Line Height 1.3 / Font Weight 600 - Sub-section headers
- **H3:** 1.25rem (20px) / Line Height 1.4 / Font Weight 600 - Card titles
- **H4:** 1.125rem (18px) / Line Height 1.4 / Font Weight 500
- **Body:** 1rem (16px) / Line Height 1.5 / Font Weight 400 - Main reading text
- **Body Small:** 0.875rem (14px) / Line Height 1.5 / Font Weight 400 - Dense table text
- **Caption / Label:** 0.75rem (12px) / Line Height 1.5 / Font Weight 500 - Tags, labels
- **Overline:** 0.75rem (12px) / Line Height 1.5 / Font Weight 600 / Uppercase - Meta labels

### Spacing & Layout Rules

Use a standard 4px/8px baseline grid:
- `2px` (micro), `4px` (xs), `8px` (sm), `16px` (md), `24px` (lg), `32px` (xl), `48px` (2xl), `64px` (3xl).

**Border Radius:**
- Small elements (buttons, inputs): `6px`
- Cards & Dialogs: `12px`

**Shadows:**
- Keep shadows restrained. Avoid deep, muddy shadows. Use sharp, subtle drop shadows for elevation and focus states only.

**Breakpoints:**
- Mobile (sm): `640px` (Stacked cards, drawer navigation, touch-friendly)
- Tablet (md): `768px` (Transition to grid layouts)
- Laptop (lg): `1024px` (Sidebar navigation becomes sticky)
- Desktop (xl): `1280px`
- Widescreen (2xl): `1536px`

## 3. Application Shell & Navigation

CampusOS will utilize a sidebar (desktop) or bottom navigation / drawer (mobile).
- **Navigation Items:** Schedule, Rooms, Events, Announcements, Assignments, and AI Assistant.
- **AI Integration:** The AI Assistant must be prominently accessible from anywhere in the application shell without taking the user away from their current context (e.g., a slide-over panel or sticky chat widget).

## 4. UI/UX Conventions

### Dashboard Conventions
- The dashboard is the central command center, not just a CRUD list.
- Use widgets/cards to show: "Today's Classes", "Upcoming Assignments", "Active Announcements".
- Do not invent fake analytics.

### Data Visualization & Tables
- **Tables:** Do not dump raw JSON or endless columns. Use sticky headers, pagination, and horizontal scrolling on mobile.
- Transform dense tables into a Card List view on mobile devices (`< 768px`).
- Include distinct status badges (e.g., `Pending`, `Submitted`, `Booked`, `Available`).
- Use subtle row hover effects. Include "Row Actions" via a clean ellipsis `...` menu.

### AI Agent UI Conventions
- **Personality:** The agent acts as a knowledgeable senior university assistant.
- **Visuals:** Use the `--color-ai` token to distinguish AI responses from standard UI elements, but do not make it look like an unrelated toy.
- **Response Layout:** Responses must be optimized for scanning—use bullet points, short paragraphs, and structured cards (e.g., rendering a booked room as a UI card instead of a text block).
- **Tool-Call Transparency:** When the AI acts, show a loading indicator (e.g., "Checking room availability...").
- **Safety & Confirmations:** For destructive or consequential actions (e.g., booking a room), the AI must present a clear confirmation card showing standard details: Room, Date, Time, Purpose.

### Forms & CRUD Operations
- Use clear labels (placed above inputs).
- Provide inline validation.
- Show a clear `loading` state during form submission. Disable the submit button to prevent double-submissions.
- Use Toast notifications for success ("Room 7A02 booked successfully") and Error ("Room is already booked").
- **Destructive Actions:** Deleting records must trigger a confirmation dialog. Avoid browser-native `alert()` or `confirm()`.

## 5. Micro-Interactions & Motion
- Keep motion subtle and under 200ms.
- **Do:** Button press feedback, hover states on cards, smooth dialog/drawer entrances.
- **Don't:** Excessive bouncing, slow page transitions, continuous background animations.
- Respect `@media (prefers-reduced-motion: reduce)`.

## 6. System States

- **Loading States:** Use skeleton loaders for structured content (tables, cards) instead of generic spinners. A screen should never be a blank white page with a spinner.
- **Empty States:** Every empty collection must have an empty state explaining: 1) What is empty, 2) Why, 3) Action to take. (Avoid just saying "No data").
- **Error States:** Catch API/backend errors gracefully. Do not show stack traces. Show actionable error messages ("Registration is full" instead of "Error 500").

## 7. Accessibility
- Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<button>`).
- Ensure all interactive elements have visible focus indicators (`:focus-visible`).
- Maintain WCAG AA color contrast ratios for text.
- Ensure the application is fully navigable via Keyboard.

## 8. Frontend AI Coding Rules
If you are an AI agent making changes to this codebase:
1. **Inspect before acting.** Do not install heavy frameworks if a lighter solution exists.
2. **Follow existing tokens.** Do not hardcode `#hex` values or random `rem` spacing.
3. **Handle all states.** A UI feature is not complete until loading, empty, and error states are implemented.
4. **Be Demo-Friendly.** Ensure that state changes in the dashboard immediately reflect in the UI and the AI agent's context. Ensure actions like booking a room visually trigger success feedback.

## Next Steps for Implementation
1. Decide on the core tech stack (e.g., Next.js/React or Vanilla TS + Vite).
2. Initialize the global stylesheet using the tokens above.
3. Build the Application Shell and foundational UI components (Button, Card, Input, Table, Dialog).
4. Integrate the five data systems into the Dashboard view.
5. Implement the AI chat interface.
