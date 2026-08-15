Using the FamilyOS design system already established in this project, build the complete UI for the FamilyOS MVP.

Do not create a new visual language.

Do not introduce new colors, typography, spacing, component styles, icon styles, radii, shadows or interaction patterns unless absolutely necessary.

Every screen must use the existing FamilyOS design tokens and reusable components from the design system.

## Product

FamilyOS is a mobile-first Progressive Web App for managing household coordination.

The MVP contains exactly:

1. Family
2. Dashboard
3. Calendar
4. Tasks
5. Shopping
6. Notifications

Do NOT include:
- Meals
- Budget
- Documents
- Location
- Messaging
- AI
- Calendar integrations
- Native-app-specific functionality

The application should feel like a polished consumer product that could realistically be shipped.

## Primary device

Design primarily for a 390px-wide mobile viewport.

Also ensure the UI responds intelligently to:
- 430px mobile
- Tablet
- Desktop

The mobile experience is the source of truth.

## Application shell

Create a mobile-first application shell with:

- Top header
- Family/user context
- Notification access
- Main content area
- Persistent bottom navigation

Bottom navigation:

Home
Calendar
Tasks
Shopping

Family/settings should be accessible from the profile/avatar.

The interface should feel like an installed PWA rather than a traditional website.

## Screen 1 — Dashboard

This is the most important screen.

The dashboard should answer:

"What does my family need to know or do today?"

Create:

### Header

Example:

"Good morning, Kayode 👋"
"Saturday, 15 August"

Include:
- Family/avatar access
- Notification icon
- Unread notification badge

### Today section

Show today's upcoming events in chronological order.

Example:

09:00
Work
Kayode

16:00
Kita pickup
Kayode

Use the established calendar/event components.

Show a concise count such as:
"2 events"

Provide a clear "View calendar" action.

### Tasks section

Show the most relevant outstanding tasks.

Example:

□ Buy diapers
  Today · Kayode

□ Take recycling out
  Today · Partner

□ Book Kita appointment
  Tomorrow · Kayode

Tasks should be directly actionable.

The user should be able to complete a task from the dashboard without opening the Tasks screen.

Show:
"3 open tasks"

Provide "View all".

### Shopping section

Show a compact preview of the active shopping list.

Example:

5 items

□ Chicken
□ Bananas
□ Diapers
□ Wipes
□ Broccoli

The user should be able to check off a shopping item directly from the dashboard.

Provide "View list".

### Upcoming section

Show upcoming family events after today.

Example:

Tomorrow
10:00 Swimming

Monday
08:30 Kita

Keep this compact.

## Dashboard design principle

Do not turn the dashboard into a grid of generic SaaS cards.

Use hierarchy, spacing and grouped sections.

The screen should feel calm and glanceable.

---

# Screen 2 — Calendar

Create a dedicated Calendar screen.

Default view:
Agenda.

Provide a secondary Week view.

### Agenda

Group events by date.

Example:

TODAY

09:00
Work
Kayode

16:00
Kita pickup
Kayode

18:30
Family dinner
Everyone

TOMORROW

10:00
Swimming
Child

Use family-member colors from the design system.

### Week view

Create a clean horizontal week selector:

Mon Tue Wed Thu Fri Sat Sun

Selected date should be visually obvious.

Show events within the selected day.

### Calendar actions

Include a prominent add-event action.

On mobile, prefer a floating action button or equally accessible action.

### Event creation

Use a mobile bottom sheet or modal.

Fields:

Title
When
Start time
End time
Who
Location
Reminder
Repeat

The title field should receive focus automatically.

Keep advanced fields visually secondary.

### Event details

Show:

- Event title
- Date/time
- Participants
- Location
- Reminder
- Recurrence
- Edit
- Delete

---

# Screen 3 — Tasks

Create a dedicated Tasks screen.

Structure:

### Header

"Tasks"

Show a concise summary:

"3 tasks need your attention"

### Filters

Use a simple segmented control:

All
Mine
Completed

Do not create complex filtering.

### Task list

Group tasks by relevance.

Example:

TODAY

□ Buy diapers
  Kayode · Household

□ Take recycling out
  Partner · Household

UPCOMING

□ Book Kita appointment
  Kayode · Admin · Tomorrow

### Task interaction

A checkbox/tap should immediately complete the task.

Use the established completion animation.

Completed tasks should move into a Completed section or disappear from the default view.

### Create task

Use a bottom sheet.

Fields:

What needs to be done?
Assign to
Due
Repeat
Priority

Keep the form compact.

---

# Screen 4 — Shopping

This should be the fastest screen in the application.

### Header

"Shopping"

Show the active list.

Example:

Groceries
5 items

### Categories

Group items by category.

Example:

PRODUCE

□ Bananas
□ Broccoli

MEAT

□ Chicken

BABY

□ Diapers
□ Wipes

### Add item

The add interaction should be extremely fast.

Tapping "+" should open a bottom sheet or inline input with autofocus.

Primary field:

"Add item..."

Optional:
- Quantity
- Unit
- Category

After adding an item, keep the interface ready for another item.

### Completion

Checking an item should immediately mark it completed.

Completed items should use the design-system completed state.

### Collaboration

Visually communicate when another family member has modified the list.

For example:

"Partner added Bananas"

Do not overdo activity indicators.

### Empty state

When the shopping list is empty:

"Nothing to buy"

"Add something your family needs."

Include a clear add action.

---

# Screen 5 — Notifications

Create a notification center accessible from the global notification icon.

### Header

"Notifications"

Show unread count.

### Notification groups

Group by:

Today
Earlier

Examples:

Calendar:

"Kita pickup in 30 minutes"

Tasks:

"Partner assigned you 'Take recycling out'"

Shopping:

"Partner added Bananas to Groceries"

Family:

"Partner accepted your invitation"

Each notification should have:
- Icon
- Title
- Short description
- Timestamp
- Unread indicator

Tapping a notification should navigate to the relevant entity.

### Notification preferences

Create a settings screen accessible from Family/Settings.

Sections:

Calendar
☑ Event reminders

Tasks
☑ Task assigned to me
☑ Task due soon

Shopping
☑ Someone adds an item

Family
☑ Family invitations

Use the design-system toggle components.

---

# Screen 6 — Family

Create a Family screen accessible from the profile/avatar.

Header:

"Your Family"

Show:

Family name
Family avatar

Members:

Kayode
Parent

Partner
Parent

Child
Child

Use large, friendly avatars and clear roles.

### Family actions

- Invite family member
- Edit family name
- Manage members
- Family settings

### Invitation

Create an invitation flow with:

"Invite someone to your family"

[Copy invite link]

Optionally allow email invitation if the design supports it.

Keep this simple.

---

# Screen 7 — Profile / Settings

Create a minimal settings area.

Sections:

Account
- Name
- Email
- Avatar

Notifications
- Notification preferences

Family
- Family management

App
- Install FamilyOS
- Appearance if supported
- About

Do not create extensive settings.

---

# Global interactions

Use the established design system for all:

- Buttons
- Inputs
- Bottom sheets
- Modals
- Toasts
- Checkboxes
- Avatars
- Badges
- Tabs
- Navigation
- Calendar elements
- Task elements
- Shopping elements

## Quick actions

The application should optimize for frequent actions.

Examples:

Complete task:
One tap

Complete shopping item:
One tap

Add shopping item:
One tap → type → Add

Create task:
Tap + → type → assign → save

Create event:
Tap + → title → date/time → save

## Bottom sheets

Use bottom sheets for creation/edit flows where appropriate on mobile.

Do not navigate to a full new screen for simple actions.

---

# States

Every major screen and component must have realistic states.

Create:

### Loading
Use skeletons rather than generic spinners where appropriate.

### Empty

Examples:

No events:
"Your calendar is clear."

No tasks:
"Nothing needs doing."

No shopping:
"Nothing to buy."

### Error

Use friendly, actionable error states.

Example:

"Couldn't load your shopping list."

[Try again]

### Offline

Because this is a PWA, create a subtle offline indicator.

Example:

"You're offline. Changes will sync when you're back online."

Do not block the entire application when offline.

### Success

Use subtle toast/snackbar feedback.

Example:

"Task completed"

"Shopping item added"

"Event created"

---

# Responsive behavior

Mobile:

- Bottom navigation
- Full-width content
- Bottom sheets
- Large touch targets
- Compact header

Tablet:

- More horizontal space
- Preserve mobile information hierarchy
- Avoid simply stretching mobile cards

Desktop:

Use a wider application shell.

Possible structure:

Sidebar navigation
+
Main content
+
Optional secondary context panel

Do not redesign the product as a generic desktop SaaS dashboard.

The same FamilyOS visual language must remain intact.

---

# Accessibility

Use the design-system accessibility rules.

Ensure:

- WCAG AA contrast
- Keyboard navigation on desktop
- Visible focus states
- Minimum approximately 44px touch targets
- Accessible labels
- Do not rely solely on color
- Semantic hierarchy

Calendar events, tasks and shopping items must communicate state through both visual and semantic cues.

---

# PWA details

Design the application as a standalone mobile PWA.

Include:

- Mobile viewport behavior
- Safe-area spacing
- Standalone app header
- Bottom navigation
- Install prompt/banner where appropriate
- Offline state
- Push notification state
- App badge/unread state

The app should visually feel like:

"An app installed on my phone"

rather than:

"A website opened in Safari."

---

# Prototype interactions

Build a realistic clickable prototype.

At minimum demonstrate:

1. Dashboard → Calendar
2. Dashboard → Tasks
3. Dashboard → Shopping
4. Dashboard → Notifications
5. Create event
6. Complete task
7. Create task
8. Add shopping item
9. Complete shopping item
10. Open notification → relevant content
11. Open Family
12. Invite family member

Use realistic sample data.

Use the same fictional family consistently throughout the prototype:

Family:
"Ayelegun Family"

Members:
Kayode
Partner
Child

Use the same family members consistently across calendar, tasks, shopping and notifications.

---

# Visual quality bar

The final result should feel like a polished consumer application that could be shipped.

Prioritize:

- Excellent spacing
- Strong typography
- Clear hierarchy
- Minimal cognitive load
- Beautiful empty states
- Consistent component behavior
- Subtle interaction feedback
- Fast, obvious primary actions
- Strong mobile ergonomics

Avoid:

- Generic SaaS dashboards
- Excessive cards
- Excessive gradients
- Excessive shadows
- Excessive rounded containers
- Decorative illustrations everywhere
- Tiny text
- Dense tables
- Unnecessary navigation
- Feature creep

The result should communicate:

"FamilyOS makes running our household feel simpler."

Do not add features that are not in this MVP.

Do not invent additional product modules.

Most importantly, use the FamilyOS design system created in the previous prompt as the authoritative source of truth for every visual and interaction decision.