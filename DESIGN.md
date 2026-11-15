---
name: Babsha
description: A free Dhaka property game presented as a collector's box seen from above, in green felt, cream card stock and antique gold foil.
world: "seed:1a18ea040a4daa67"
colors:
  felt-deep: "#052A1D"
  felt: "#0A4430"
  felt-lit: "#13694A"
  cream: "#F1E6CC"
  cream-deep: "#E4D6B0"
  ink: "#0A2E21"
  gold: "#D4B35E"
  gold-deep: "#8A6A1C"
  die-red: "#C8232C"
typography:
  display:
    fontFamily: "Gloock, Times New Roman, serif"
    fontSize: "9.375rem"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  lid-title:
    fontFamily: "Gloock, Times New Roman, serif"
    fontSize: "6.75rem"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Gloock, Times New Roman, serif"
    fontSize: "4.5rem"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Gloock, Times New Roman, serif"
    fontSize: "2.875rem"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "0em"
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.16em"
rounded:
  hairline: "2px"
  tile: "3px"
  die: "15px"
  disc: "50%"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  sm: "8px"
  md: "18px"
  lg: "36px"
  section: "16svh"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    typography: "{typography.label}"
    rounded: "{rounded.hairline}"
    padding: "0 22px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.felt-deep}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.felt-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.hairline}"
    padding: "0 32px"
    height: "56px"
  button-gold-hover:
    backgroundColor: "{colors.cream}"
  card-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "38px 36px 32px"
  box-lid:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "52px 48px 60px"
  chip:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "7px 12px"
  hud:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    padding: "10px 22px"
---

# Design System: Babsha

## Overview

**Creative North Star: "The Collector's Box"**

The whole site is one boxed game seen from above. A bottle-green felt table, a cream card-stock lid, brass ride pieces, and antique gold foil used only for hairlines, double rules and the single call to action. It should feel like an edition people would pay for, though the game is free. The first screen is the box lid itself; picking a ride lifts it away and the 3D board appears on the felt.

Density is low and deliberate: large serif type on flat, grained surfaces, one gold accent, no decoration that is not physical (paper grain, foil, felt, dice). Depth comes from objects resting on a surface, not from light effects. The scene behind the page is retinted to the same world: felt green with cream and gold light only.

Confirmed rejections (surface brief): the dark glass-panel game landing, backdrop blur, neon night city, rainbow palettes.

**Key Characteristics:**
- Three materials only: felt (green, grained), card stock (cream, grained, ink text), foil (gold gradient, thin).
- Gloock display over Hanken Grotesk body; uppercase tracked grotesk only on buttons and small chips.
- Cream cards carry a gold double border: a 3px foil outer rule and a 1px ink inner rule.
- Deliberately oversized editorial display type, up to 150px.
- Motion is physical: the lid lifts, discs spin on hover, panels rise into place on scroll.

## Colors

A restrained green, cream and gold palette. Red appears only as an object colour (dice and vehicles), never as UI.

### Primary
- **Bottle Felt** (#0A4430): the page ground, lit toward #13694A at the top centre and falling to #052A1D at the edges.
- **Antique Gold Foil** (#D4B35E): button outlines and fills, focus rings, hairlines (50% alpha), ride caps, the brand wordmark. Foil gradient (`#F0DC9B, #B8943C, #E9D28A, #8A6A1C`) is used for double borders and medallion rims only.

### Secondary
- **Card Cream** (#F1E6CC): panel and lid stock, display type on felt, the white die, the HUD. Over felt, secondary text is cream at 76% alpha.
- **Deep Cream** (#E4D6B0): second stock tone for board tile faces and shading.

### Tertiary
- **Die Red** (#C8232C): the red die and the vehicle bodies in the picker. Nothing else in the interface.

### Neutral
- **Pine Ink** (#0A2E21): all text on cream stock (body at 86% alpha) and card inner rules (30% alpha).
- **Deep Felt** (#052A1D): page edge, loader, nav bar once the hero is passed, text on gold fills.
- **Aged Gold** (#8A6A1C): the dark end of foil, marquee diamonds, the HUD outer rule.

### Named Rules
**The Foil Is Thin Rule.** Gold is a line or a single button fill, never a large surface. A screen with a gold area bigger than a button has gone wrong.

**The Red Is An Object Rule.** Red belongs to dice and rides. Do not use it for links, badges, alerts or buttons.

**The Three Stocks Rule.** Every surface is felt, cream stock or foil. A fourth surface colour is a new world, not an extension.

## Typography

**Display Font:** Gloock (with Times New Roman, serif), self-hosted via @fontsource, weight 400 only.
**Body Font:** Hanken Grotesk (with system-ui, sans-serif), weights 500, 600, 700, 800 loaded; 500 body, 700 labels.

**Character:** A high-contrast display serif with the authority of a printed box lid, over a plain, legible grotesk. The serif carries every emotional line; the grotesk only explains.

### Hierarchy
- **Display** (400, clamp(60px, 11vw, 150px), 0.9): hero title and the closing "Roll the dice." (letter-spacing -0.03em). Deliberately above the usual 6rem ceiling to match the editorial scale of the cited reference.
- **Lid Title** (400, clamp(54px, min(8.2vw, 10.4svh), 108px), 0.94): the title on the box lid; also exceeds 6rem on purpose and shrinks with viewport height so the lid never overflows.
- **Headline** (400, clamp(40px, 5vw, 72px), 0.98): section heads; the `big` variant reaches 88px.
- **Title** (400, clamp(28px, 3.4vw, 46px)): ledger rows; panel heads use clamp(38px, 4.4vw, 62px) in ink.
- **Body** (500, 18px, 1.55): supporting lines, up to 22px for sub-heads. Cap at 46ch in ledger rows, 560 to 620px elsewhere.
- **Label** (700, 11 to 15px, 0.12 to 0.3em tracking, uppercase): buttons, chips, tags. Short strings only.

### Named Rules
**The Serif Speaks Rule.** Headlines, numerals, medallion names and the HUD readout are Gloock. Grotesk never sets a headline.

**The Big On Purpose Rule.** Display type above 6rem is allowed only for the hero title, the closing line and the lid title, and it always uses a clamp that falls to 60px or lower on phones.

## Layout

A scroll journey around a fixed 3D board. The canvas and a grain-and-vignette overlay are fixed behind; copy sits above in `main`. Gutter is `clamp(16px, 4vw, 56px)`. Each journey stop is a tall scroll section (250svh, 340svh for the last) holding a fixed cream panel, 420px wide (36vw max) and alternating left and right at `clamp(24px, 6vw, 96px)` from the edge. Below 900px the panel docks to the bottom as a full-width card with 14px margins and the HUD moves to the top.

After the journey: a features ledger (two-column grid, 1fr to 1.1fr, 56px gap, gold hairline rows), a gold-ruled marquee, a closing section and a footer, all in a 1180px wrap. Section spacing is 16svh top. The first screen is a fixed full-viewport "table": the 1100 by 500px lid centred high, three ride medallions below, two dice on the felt at the lower right (hidden under 900px). The nav is a 3-column grid with the wordmark centred; once past the hero it gains a solid felt ground and a gold hairline.

The first screen is gated by the ride picker and every visit starts with it. Reduced-motion and no-WebGL visitors get a plain document flow without the picker: static hero, stacked cream panels, no fixed layers.

## Elevation & Depth

Objects rest on the felt; depth is cast shadow, not glow. Every raised object (lid, panel, die, medallion) has a large soft black shadow underneath, with no blur on the surfaces themselves and no backdrop filter anywhere.

### Shadow Vocabulary
- **Lid and panel** (`box-shadow: 0 50px 90px rgba(0,0,0,.55)` lid; `0 40px 80px rgba(0,0,0,.5)` panel): a card lifted well above the felt.
- **Medallion** (`0 0 0 7px felt, 0 0 0 9px #B8943C, 0 26px 40px rgba(0,0,0,.5)`): a brass ring set into the felt; on hover the outer ring turns cream.
- **Die** (`0 20px 24px rgba(0,0,0,.5)`) and **mini card** (`0 8px 20px rgba(0,0,0,.3)`).
- **HUD** (`0 0 0 1px gold, 0 0 0 5px cream, 0 0 0 6px gold-deep, 0 18px 40px rgba(0,0,0,.45)`): a plaque with a ringed edge.

### Named Rules
**The Resting Object Rule.** A shadow means an object is lying on the felt, so it always falls straight down and is large and soft. Hard offset shadows and coloured glows are not part of this world.

## Shapes

Near-square, like printed stock. Cards, the lid, panels, chips and buttons are square or 2px. Tiles are 3 to 4px. Round forms are reserved for physical pieces: medallions (50%) and dice (15px). Double borders are the signature: an outer 3 to 10px foil rule offset 7 to 13px outside the card, plus a 1px inner ink rule inset 9 to 14px. Mini cards on a panel tilt 2 degrees like cards dealt on a table.

## Components

### Buttons
- **Shape:** square with a 2px radius, min height 44px (56px large), uppercase Hanken 700 at 14px, 0.16em tracking.
- **Outline (default):** transparent, 1px gold border, gold text; hover fills gold with deep felt text.
- **Gold (primary):** solid gold, deep felt text; hover turns cream. One per view.
- **Focus:** 3px gold outline, 3px offset on every focusable element. Active presses 1px down.

### Cards / Containers
- **Cream panel:** card stock with grain (cream at 86% over the noise texture), ink text, gold double border, 38px/36px padding, rises 26px into place as `--show` goes to 1.
- **Box lid:** the first-screen variant at 1100 by up to 500px: two columns (title left, tilted board art right in a gold-bordered felt window), ink hairline above the sub line. It lifts off at the reveal.

### Chips
- Uppercase 12px Hanken 700, 0.14em tracking, 1px ink border at 40% alpha on cream, with a 10px square colour swatch. Marquee chips drop the border and swatch and sit between gold diamonds.

### Navigation
- Fixed top bar, wordmark centred in Gloock capitals at 0.26em tracking in gold, "Play now" outline button at the right. Over the hero it sits on a felt-to-transparent fade; after the hero it is solid felt with a hairline.

### Ride Medallion (signature)
- A brass-rimmed round disc (84 to 150px by viewport height) holding a vehicle drawing, a Gloock name and a small gold caption. Hover lifts it 10px, spins the wheels, and turns the outer ring cream. It is the first control a visitor meets and becomes the pawn.

### Ledger
- Rows with gold hairlines top and bottom, a Gloock title left and muted body right; hover tints the row gold at 7% and shifts it 12px right. A "soon" row carries a diagonal gold hatch and a gold tag.

## Do's and Don'ts

### Do:
- **Do** build every surface from felt (#0A4430 family), card stock (#F1E6CC with grain) or thin gold foil (#D4B35E).
- **Do** set all headlines in Gloock and every sentence of explanation in Hanken Grotesk 500.
- **Do** frame cream cards with the gold double border and keep corners at 0 to 2px.
- **Do** cast big, soft, straight-down black shadows under raised objects.
- **Do** keep the 3D scene on felt green with cream and gold light only.
- **Do** give reduced-motion and no-WebGL visitors the plain page: all copy readable without the picker or fixed layers.

### Don't:
- **Don't** use backdrop blur, glass panels, neon or glows; this world replaced a dark glass site.
- **Don't** use red outside dice and vehicle bodies, or add a rainbow of accent colours to the interface.
- **Don't** fill large areas with gold or add a fourth surface colour.
- **Don't** round cards or buttons; only medallions and dice are round.
- **Don't** use hard offset shadows or tinted glows.
- **Don't** set display type above 6rem outside the hero title, the lid title and the closing line.
