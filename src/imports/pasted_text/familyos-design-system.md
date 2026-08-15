Design and establish a complete production-quality design system for a product called "FamilyOS".

FamilyOS is a mobile-first Progressive Web App for family coordination. It helps a household understand what is happening today, what needs to be done, what needs to be bought, and what requires attention.

The MVP contains only:
- Family
- Dashboard
- Calendar
- Tasks
- Shopping
- Notifications

Do NOT design UI for:
- Meals
- Budget
- Documents
- Location tracking
- Messaging
- AI
- Native mobile apps
- Other features outside the MVP

The design system will be used as the single visual language for the entire FamilyOS application. It must feel cohesive, premium, calm, approachable, modern, and highly usable.

## Design direction

FamilyOS should feel like a combination of:
- Apple's clarity and restraint
- Linear's polished product UI
- Things' simplicity
- Modern family-oriented warmth

Avoid making it look childish, overly playful, overly corporate, or like a generic SaaS dashboard.

The product is for adults managing a household, so the visual language should be sophisticated and calm while still feeling warm and human.

The design should communicate:
- Calm
- Trust
- Organization
- Family
- Simplicity
- Low cognitive load
- Immediate clarity

Use generous spacing, excellent typography, subtle hierarchy, restrained borders, soft surfaces, and meaningful use of color.

Do not overuse cards. Use cards only where they improve grouping or hierarchy.

## Color system

Create semantic color tokens rather than using raw colors throughout the design.

Primary:
- A deep blue/indigo accent that communicates trust and reliability.
- Use it primarily for primary actions, active navigation, links, selected states and important interactive elements.

Neutrals:
- Warm off-white/light background
- White surfaces
- Dark charcoal primary text
- Muted gray secondary text
- Light gray borders/dividers

Semantic colors:
- Success: restrained green
- Warning: warm amber
- Error: muted red
- Info: blue

Family member colors:
Create a small, accessible palette that allows family members to be visually distinguished in calendar events and assignments.

The family-member palette must work against both light surfaces and the application background.

Ensure sufficient contrast and avoid relying solely on color to communicate meaning.

Create tokens for:
- Background
- Surface
- Surface elevated
- Surface muted
- Text primary
- Text secondary
- Text tertiary
- Border
- Border strong
- Primary
- Primary hover
- Primary pressed
- Primary subtle
- Success
- Warning
- Error
- Info
- Focus ring
- Disabled

## Typography

Use a highly legible modern sans-serif typeface.

Prefer:
- Inter
or
- SF Pro / system sans equivalent if available.

Define a complete type scale.

Include:
- Display
- H1
- H2
- H3
- Body large
- Body
- Body small
- Caption
- Label
- Button
- Numeric/stat styles

Typography should prioritize readability on mobile.

Use medium and semibold weights sparingly. Avoid excessive bold text.

Create explicit tokens for:
- Font family
- Font size
- Line height
- Font weight
- Letter spacing

## Spacing

Use a consistent spacing scale based on a 4px foundation.

Create tokens such as:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 64

The interface should generally feel spacious rather than dense.

## Radius

Use a restrained radius system.

Define:
- Small
- Medium
- Large
- Extra large
- Pill

The overall visual language should have soft but not excessively rounded corners.

Avoid making every element look like a pill.

## Elevation

Use subtle elevation.

Define:
- None
- Low
- Medium
- High

Prefer borders and surface contrast over heavy shadows.

Shadows should be soft and barely perceptible.

## Icons

Use a consistent outline icon family.

Icons should be:
- Simple
- Rounded
- Minimal
- Consistent in stroke width

Define standard sizes:
- 16
- 20
- 24
- 32

Use icons from a single coherent icon family.

Do not mix icon styles.

## Component library

Create reusable components with variants and states.

At minimum include:

### Buttons
- Primary
- Secondary
- Tertiary
- Destructive
- Icon button
- Floating action button

States:
- Default
- Hover
- Pressed
- Focused
- Disabled
- Loading

### Inputs
- Text input
- Search
- Textarea
- Select
- Date picker trigger
- Time picker trigger

States:
- Default
- Focused
- Filled
- Error
- Disabled

### Navigation
- Mobile bottom navigation
- Desktop navigation where appropriate
- Tab
- Segmented control
- Header
- Back button

### Cards
- Standard surface card
- Interactive card
- Compact card
- List section

### Lists
- List item
- Section header
- Swipe/action affordance
- Empty state

### Avatars
- User avatar
- Family member avatar
- Avatar group
- Initials fallback

### Badges
- Status badge
- Count badge
- Notification badge
- Category badge

### Checkboxes
- Unchecked
- Checked
- Disabled
- Indeterminate

### Toggles
- On
- Off
- Disabled

### Calendar components
- Event chip
- Calendar event
- Day header
- Week header
- Agenda row
- Date selector
- Reminder selector

### Task components
- Task row
- Assignee avatar
- Due date
- Priority indicator
- Recurring task indicator

### Shopping components
- Shopping item
- Category header
- Quantity control
- Completed item
- Shopping list header

### Notifications
- Notification item
- Notification badge
- Notification group
- Notification preference row

### Family components
- Family member row
- Family member avatar
- Role badge
- Invitation row

### Feedback
- Toast
- Snackbar
- Modal
- Bottom sheet
- Confirmation dialog
- Empty state
- Error state
- Loading state
- Skeleton

## Interaction principles

FamilyOS is designed for quick, repeated household interactions.

Design components to minimize friction.

Examples:
- Completing a task should require one tap.
- Adding a shopping item should be extremely fast.
- Creating an event should require minimal fields initially.
- Important actions should be available without navigating through multiple screens.
- Destructive actions should require confirmation when appropriate.
- Use bottom sheets for mobile creation/edit flows where appropriate.

## Responsive design

The primary target is a mobile PWA.

Design around:
- 390px mobile viewport as the primary reference
- 430px mobile viewport as a secondary reference
- Tablet
- Desktop

Mobile is the source of truth.

The desktop experience should expand the same design language rather than becoming a completely different application.

## PWA-specific design

Account for:
- Safe areas
- Mobile browser viewport
- Standalone Home Screen mode
- Bottom navigation
- Touch targets
- Pull-to-refresh behavior where appropriate
- Fixed/sticky headers
- Fixed bottom navigation
- Touch-friendly controls

Minimum interactive touch target should generally be approximately 44px.

## Accessibility

Design for WCAG AA-level contrast.

Do not rely solely on color.

Interactive elements must have:
- Visible focus state
- Clear disabled state
- Clear selected state
- Clear error state

Typography must remain readable at mobile sizes.

## Motion

Use subtle motion only where it improves comprehension.

Examples:
- Task completion animation
- Shopping item completion
- Navigation transitions
- Bottom sheet presentation
- Toast appearance
- Notification badge changes

Avoid decorative animation.

Motion should feel fast and calm.

## Design-system documentation

Create a dedicated design-system page containing:

1. Brand / visual principles
2. Color tokens
3. Typography tokens
4. Spacing tokens
5. Radius tokens
6. Elevation
7. Iconography
8. Components
9. Component states
10. Mobile patterns
11. Accessibility guidance
12. Usage examples

Use clear naming conventions for components and variants.

Create components so they are genuinely reusable by the application UI that will be designed in the next step.

The final result should look like a real product design system prepared for engineering handoff, not a mood board or collection of unrelated UI examples.

Most importantly: establish a strong, distinctive FamilyOS visual language that can be consistently applied across Dashboard, Calendar, Tasks, Shopping, Family and Notifications.