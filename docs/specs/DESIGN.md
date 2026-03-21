# Design System Specification: Biometric Precision & Tactical Elegance

## 1. Overview & Creative North Star: "The Digital Sentry"

The Creative North Star for this design system is **"The Digital Sentry."** It represents a departure from friendly, rounded consumer software toward a high-fidelity, mission-critical interface. This is a system built for speed, accuracy, and technical authority.

To break the "template" look, we move away from centered, symmetrical layouts. Instead, we utilize **Intentional Asymmetry**: heavy data density on one axis balanced by expansive, dark negative space on the other. Elements should feel "docked" or "modular," like a physical heads-up display (HUD). Overlapping data visualization over live camera feeds creates a sense of depth and real-time processing that feels cinematic yet functional.

---

## 2. Colors & Surface Architecture

The palette is rooted in deep obsidian tones, punctuated by high-energy cyan accents that mimic the glow of a scanner.

### The Color Palette (Material Design Tokens)

- **Core Background:** `background` (#0c0e10) — The "void" that provides maximum contrast.
- **Primary Accent:** `primary` (#8ff5ff) — Use exclusively for active states, biometric focus points, and critical actions.
- **Surface Tiers:**
  - `surface_container_lowest` (#000000) for deep recesses.
  - `surface_container` (#171a1c) for standard UI modules.
  - `surface_bright` (#292c30) for high-impact hover states.

### The "No-Line" Rule

Traditional 1px solid borders for sectioning are strictly prohibited. Layout boundaries must be defined through:

1.  **Tonal Shifts:** Place a `surface_container_high` module directly onto a `surface_dim` background.
2.  **Negative Space:** Use the Spacing Scale (specifically `8` to `12`) to create "air" between functional blocks.
3.  **Subtle Glows:** Use a 1px inner shadow of `primary` at 10% opacity to define a container’s edge without a "stroke."

### The "Glass & Gradient" Rule

Floating panels (like capture overlays) must use **Glassmorphism**. Apply `surface_container` with a 12px Backdrop Blur. Use a linear gradient from `primary` to `primary_container` for primary CTAs to give them a "charged" energy that flat fills lack.

---

## 3. Typography: Technical Authority

We pair the geometric clarity of **Space Grotesk** with the functional precision of **Inter**.

- **Display & Headlines (Space Grotesk):** Use for biometric IDs, system status, and large numerical data. Space Grotesk’s subtle "ink traps" provide a high-tech, engineered feel.
  - _Styling:_ Set `headline-lg` to uppercase with a `0.05em` letter-spacing for a tactical look.
- **Body & Labels (Inter):** Used for instructional text and metadata.
  - _Styling:_ `label-sm` should be used for "micro-data" (e.g., timestamp, coordinates) to maintain an editorial, information-dense aesthetic without sacrificing legibility.

---

## 4. Elevation & Depth

In this system, depth is not "shadows"; it is **Luminance and Layering.**

- **Tonal Layering:** Stack modules like hardware components. A `surface_container_lowest` panel nested within a `surface_container_high` card creates a "milled" effect, as if the UI was carved out of a single block of dark glass.
- **Ambient Shadows:** For floating modals, use a shadow color derived from `surface_tint` (#8ff5ff) at 4% opacity. The blur should be large (32px+) to simulate the soft ambient glow of a monitor in a dark room.
- **The Ghost Border:** If a container requires a perimeter (e.g., a face-capture bounding box), use `outline_variant` at 20% opacity. It should be barely perceptible, felt rather than seen.

---

## 5. Components

### Buttons & Interaction

- **Primary Button:** Background: `linear-gradient(primary, primary_container)`. Text: `on_primary_fixed`. Shape: `lg` (0.5rem). Add a subtle `primary` outer glow on hover.
- **Secondary/Tactical:** No fill. `1px` border using `primary` at 30% opacity.

### Input Fields & Biometric Scanners

- **Text Inputs:** Use `surface_container_lowest` as the fill. On focus, the bottom border "activates" by transitioning from `outline_variant` to a `primary` glow.
- **Capture Bounding Box:** Use `sm` (0.125rem) corner radii. The corners should be 100% opaque `primary`, while the connecting lines are 10% opacity.

### Cards & Lists

- **The Divider Ban:** Never use horizontal lines to separate list items. Use a background shift of `surface_container_low` for every even-numbered row, or use `1.5` (0.3rem) vertical spacing to let proximity define the relationship.
- **Biometric Data Chips:** Use `secondary_container` with `label-sm` text. Ensure the `border-radius` is `DEFAULT` (0.25rem) to keep the "edgy" aesthetic.

### Additional Component: "The Status Bar"

A persistent, thin horizontal strip at the top/bottom. Use `surface_container_highest` with `label-sm` Inter. This should house "system heartbeat" data (latency, capture count, hardware temp) to reinforce the surveillance theme.

---

## 6. Do’s and Don’ts

### Do:

- **DO** use monochromatic icons (from a technical set like Phosphor or Lucide) in `primary`.
- **DO** lean into asymmetry. It’s okay if the left side of the screen is denser than the right.
- **DO** use "Micro-copy." Adding small technical labels (e.g., "SYS_REF_04") near headings adds to the "Digital Sentry" vibe.

### Don't:

- **DON'T** use 100% white. Use `on_background` (#f1f0f3) to prevent eye strain in high-contrast dark mode.
- **DON'T** use large border radii. Anything above `xl` (0.75rem) will make the interface feel like a toy. Keep it sharp (4px-8px).
- **DON'T** use standard "Drop Shadows." They look muddy. Use tonal shifts or ambient glows instead.
