---
version: alpha
name: Ladies on the Links Sports League Template
description: A premium, elegant sports league landing page designed with a soft, sophisticated palette and high-contrast serif typography, tailored for a women\'s golf community.
colors:
  primary: "#1A4A33"
  accent-gold: "#DE809F"
  accent-moon: "#EBA9BE"
  background: "#F6EFDF"
  ink: "#1C1C22"
  text-slate: "rgba(30, 41, 59, 0.7)"
typography:
  headlines: "Newsreader, serif"
  body: "Geist, sans-serif"
  button: "Geist, 0.1em letter-spacing"
spacing:
  base: 1rem
  section-py: 7rem
  card-p: 1.75rem
rounded:
  buttons: 9999px
  cards: 2rem
  sections: 2.5rem
components:
  primary-button: "zen-btn"
  ghost-button: "ghost-btn"
  surface: "liquid-glass"
---

## Overview
The Ladies on the Links visual identity is defined by a "Garden-Industrial" aesthetic—combining the deep, organic tones of a golf course (Sage Green) with soft, luxury feminine accents (Gold/Rose Pink). The layout is airy and high-density in content but low-density in visual weight, utilizing wide gutters, generous vertical rhythm, and delicate borders. The tone is welcoming, aspirational, and sophisticated, avoiding traditional "sports" grit in favor of a country club lifestyle feel. Motion is reserved for smooth entries and subtle hover lifts, emphasizing a calm and premium experience.

## Colors
- **Sage (Primary)**: #1A4A33 used for headlines, dark backgrounds, and primary branding.
- **Gold (Accent)**: #DE809F used for active states, highlights, and primary gradients.
- **Moon (Accent)**: #EBA9BE used for secondary gradients and soft UI highlights.
- **Ivory (Background)**: #F6EFDF providing a warm, high-end alternative to stark white.
- **Ink**: #1C1C22 used for body text and deep contrast elements.
- **Gradients**: Linear blends from Gold (#DE809F) to Sage (#1A4A33) are used for text and button surfaces.

## Typography
- **Display Serif**: Newsreader is used for all major headings and branding. It is characterized by light weights and italic variations to convey elegance.
- **Functional Sans**: Geist is the primary typeface for navigation, labels, and body copy. It is rendered with light weights (300-400) and increased letter spacing on uppercase labels.
- **Scale**: Headlines use a fluid scale (clamp) ranging from 2.8rem to 5.5rem. Metadata labels use a strictly uppercase 10px-12px size with 0.2em tracking.

## Layout
- **Grid System**: A standard 12-column logic is applied via Tailwind containers, with a max-width of 7xl (1280px) for content.
- **Asymmetry**: Featured sections (like the "Lunar Paths") utilize offset vertical transforms (e.g., `md:translate-y-6`) to break the rigid grid and create visual interest.
- **Navigation**: A fixed-position, floating "Liquid Glass" top bar with a 3px offset from screen edges.

## Elevation & Depth
- **Surface Material**: "Liquid Glass" uses `backdrop-blur(20px)` with a 72% opacity background and 20% opacity borders to create layering without heavy drop shadows.
- **Depth Cues**: Cards use a subtle `box-shadow` that intensifies on hover (60px blur). A global noise overlay at 1.8% opacity provides tactile texture across the entire viewport.
- **Glows**: Soft radial glows (`blur-[120px]`) are placed behind key sections to highlight content priority.

## Shapes
- **Pill Radii**: All interactive elements (buttons, badges, inputs) use a 9999px fully rounded radius.
- **Container Radii**: Major section containers and cards use a progressive rounding system: 1.5rem for small cards, 2rem for medium blocks, and 2.5rem for immersive full-width sections.
- **Geometric Accents**: Circular logos and icons are consistently framed in 1px borders.

## Components
- **Zen Button**: A premium CTA featuring a conic-gradient "beam-spin" animation behind a primary gradient surface. High hover expansion and letter-spacing transition.
- **Ghost Button**: Transparent with a 20% opacity Sage border and 3% opacity fill, utilizing blur for a glass-morphism effect.
- **Liquid Glass Nav**: A floating pill-shaped container with high saturation and blur.
- **Quick Preview Card**: Interactive cards that reveal a blurred, dark overlay on hover containing secondary metadata and action links.
- **Pricing Cards**: Two variants; a standard white card and a "Premium" liquid glass card featuring a background image with a dark wash and "Save %" badges.

## Page Sections

### Navigation
A floating, fixed-top bar containing a dual-text logo (italic serif + light sans), center-aligned links with animated bottom borders (width 0% to 100% on hover), and a Register CTA.

### Hero Section
Full-viewport height with a background image overlayed with a lightened mix-blend mode. Central content hierarchy: Uppercase badge -> Large serif headline -> Slate body text -> Persona-based ghost buttons -> Zen CTA.

### Lunar Paths (Features)
Three-column grid of vertical cards. Each card features an image with a black-to-transparent gradient wash, an icon badge, and text that translates vertically on hover to reveal additional descriptions.

### Meet the Pro (Carousel)
Horizontal scrolling section with a left-aligned heading. Cards feature a 3:4 aspect ratio with "Quick Preview" hover states. Includes duration badges (e.g., "60 MIN") in the top-left corner.

### Immersive Gallery Preview
A high-contrast section with a fixed-height background, heavy backdrop blur, and a centralized circular play button designed with the Liquid Glass material.

### Stats Bar
A four-column centered layout on a light gold background. Numbers use the Newsreader serif with a gold-to-sage gradient and count-up animation logic.

### Pro Shop Preview
Grid of product cards. Each card features a top-aligned gradient border that only appears on hover (scale-x animation) and a high-contrast "Pre-order" badge.

### Community Marquee
A seamless, infinite horizontal loop of community snapshots using rounded-2xl image frames and a linear-gradient mask to fade the edges into the background.

### Pricing / Membership
Two distinct cards: "Half Season" (clean, white) and "Full Season" (premium glass over image). Features high-contrast typography for pricing ($299) and check-circle icon lists for benefits.

### Footer
A deep sage (#123425) background with gold accents. Organized into five columns (Branding, Explore, Company, Legal). Includes social icons in circular glass frames and a bottom-aligned copyright bar with a golf-themed icon.

## Motion & Interaction
- **Reveal-on-Scroll**: Elements utilize `revealUp` keyframes (opacity 0 + 40px Y-offset to visible) with staggered delays from 100ms to 500ms.
- **Marquee**: Infinite `translateX(-50%)` at 55s duration for image strips.
- **Hover Lifts**: Cards translate -6px on Y-axis with a cubic-bezier easing.
- **Active Nav**: A logic-based class system that forces navigation links to 100% border-bottom width based on the current page section.
- **Counters**: JavaScript-driven increments for statistics when they enter the viewport.

## Do's and Don'ts
- **Do**: Use serif italics for brand emphasis. Keep background colors warm and off-white. Use glass-morphism for floating UI.
- **Don't**: Use sharp 90-degree corners. Use pure black (#000) for text. Use heavy, opaque shadows.

## Accessibility
- **Focus States**: High contrast transitions on all buttons.
- **Readability**: Newsreader headlines utilize clamp values to prevent text overflow on mobile while maintaining legibility. Selection color is customized to Gold (#DE809F) with white text.
- **Navigation**: Mobile menu is accessible via a hamburger toggle that reveals a full-width vertical stack.

## Assets
1. `https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400&display=swap` (Primary Fonts)
2. `https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js` (Icon Library)
3. `https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js` (Motion/Background Script)
4. `https://images.unsplash.com/photo-1593111774640-5452f1b402ea?w=1600&q=80` (Hero Image)
5. `https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80` (Energize Feature)
6. `https://images.unsplash.com/photo-1593111774240-d529f12eb4a6?w=800&q=80` (Restore Feature)
7. `https://images.unsplash.com/photo-1535136029863-4a3e36cd380c?w=800&q=80` (Learn Feature)
8. `https://images.unsplash.com/photo-1622025461364-717fd7e3344d?w=800&q=80` (Clinic 1)
9. `https://images.unsplash.com/photo-1592555059503-0a774cb8d477?w=800&q=80` (Clinic 2)
10. `https://images.unsplash.com/photo-1535135967008-011f07f43db4?w=800&q=80` (Clinic 3)
11. `https://images.unsplash.com/photo-1600147175402-31ec19e71052?w=800&q=80` (Clinic 4)
12. `https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=2000&q=80` (Gallery Background)
13. `https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=800&q=80` (Shop 1)
14. `https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80` (Shop 2)
15. `https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80` (Shop 3)
16. `https://images.unsplash.com/photo-1528731708534-816fe59f90cb?w=1600&amp;q=80` (Pricing Background)

### Exported Codebase Asset Inventory
1. other: https://cdn.tailwindcss.com
   Context: index.html: markup attribute; index.html: absolute url literal
2. embed: https://fonts.gstatic.com
   Context: index.html: markup attribute; index.html: absolute url literal
3. other: https://www.googletagmanager.com/gtag/js?id=G-2M6V79H761
   Context: index.html: markup attribute; index.html: absolute url literal
4. embed: https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..800&display=swap
   Context: index.html: markup attribute; index.html: absolute url literal
5. other: https://images.unsplash.com/photo-1593111774240-d529f12eb4a6?w=600&q=80
   Context: index.html: markup attribute; index.html: absolute url literal
6. other: https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600&q=80
   Context: index.html: markup attribute; index.html: absolute url literal
7. other: https://images.unsplash.com/photo-1535136029863-4a3e36cd380c?w=600&q=80
   Context: index.html: markup attribute; index.html: absolute url literal
8. other: https://images.unsplash.com/photo-1622025461364-717fd7e3344d?w=600&q=80
   Context: index.html: markup attribute; index.html: absolute url literal
9. other: https://images.unsplash.com/photo-1592555059503-0a774cb8d477?w=600&q=80
   Context: index.html: markup attribute; index.html: absolute url literal
10. other: https://images.unsplash.com/photo-1535135967008-011f07f43db4?w=600&q=80
   Context: index.html: markup attribute; index.html: absolute url literal
11. other: %23n
   Context: index.html: css url()
12. other: http://www.w3.org/2000/svg
   Context: index.html: absolute url literal
