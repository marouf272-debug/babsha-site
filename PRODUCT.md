# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
People deciding whether to play Babsha: friends and family, mostly on phones, many in Bangladesh and its diaspora, who have a minute to spare and a group to play with. Their job on the site is to understand what the game is and press Play.

## Product Purpose
Babsha is a free, Dhaka-themed property trading board game that runs in a phone browser. Two to six players pass one phone, or one player takes on the computer. It installs to the home screen and works offline after the first visit. The website exists to make people want to play it and send them to the live game. Success is a click on Play.

## Positioning
The only property trading game built around Dhaka: 40 real Dhaka-named tiles, card text about daily Dhaka life (Metro Rail, load-shedding, kite contests), played with a rickshaw, a CNG or a bus as the pawn. It is digital and free, but should feel like a collector's edition people would pay for.

## Operating Context
Visitors arrive from a shared link on a phone or desktop. The page is a scroll journey around the board: dice rolls, a pawn that drives tile to tile, one stop per feature. A ride picker (rickshaw, CNG, bus) opens every visit and the chosen vehicle becomes the pawn.

## Capabilities and Constraints
- Game facts: 2 to 6 players, vs computer (Easy, Medium, Hard), live auctions, trading, building up to four houses and a hotel, mortgages, Jam (traffic jail) and Cha Adda (free rest) corners, Lucky and DOHS card decks, optional turn timer, installable PWA.
- English only on the site. The game itself also has Bangla; the site does not mention it.
- No prices or money amounts anywhere on the site.
- Nothing that frames a neighborhood as something to "own" or buy as a boast, no "Own Dhaka" lines. Card tone: shared daily-life humor, never a neighborhood as the punchline.
- No donation or payment in v1; a donation feature is planned for V2.
- No creator story. The product is the game.
- Static site on GitHub Pages (Vite and Three.js). Nothing is deployed from the rebuild until the owner approves.
- Undecided: the "coming soon" feature is unnamed.

## Brand Commitments
Name: Babsha. Logo: "Double Six", two dice (one cream, one red) with the wordmark. Keep the ride picker, the scroll journey around the board with rolling dice and a driving pawn, and the logo.

## Evidence on Hand
The live game at https://marouf272-debug.github.io/babsha/. Real tile names, groups and card text in src/data. Model kit for landmarks, dice, rickshaw, CNG and bus in src. There are no testimonials, player counts or press; none may be invented.

## Product Principles
1. The game is the product: show the board, the dice and the vehicles, not people or claims.
2. Free should never look cheap: restraint, craft and detail over effects.
3. Dhaka is a setting to celebrate, never a boast or a punchline.
4. The motion must be readable: vehicles drive at a visible speed with clear cues.

## Accessibility & Inclusion
Reduced-motion and no-WebGL visitors get a plain readable page. Text meets WCAG AA contrast. Phone first.
