# MATH VOCABULARY TRANSLATOR

Turn math words into math. A client-only web app with a concept-first parser, practice generator, mistakes dashboard, and offline storage.

## Quick start
1. Open `index.html` in any modern browser (works offline).
2. Try phrases such as “five more than twice a number” or “probability of A given B”.
3. View explanations, common traps, practice items, and log mistakes locally.

## Project structure
- `index.html` – multi-route UI (Home, Learn, Practice, Mistakes, About) plus feedback modal.
- `styles.css` – responsive, accessible styling with light/dark modes.
- `app.js` – rule-based translation engine, router, practice logic, charts, storage utilities.
- `data/examples.js` – 100+ curated phrases with expected expressions and LaTeX.
- `tests/test.js` – 20-sample smoke tests (run via console: `runTranslatorTests()`).

## Deploy to GitHub Pages
1. Commit and push this folder to GitHub.
2. In repo settings, enable Pages from the main branch root.
3. Visit the published URL. No backend or build steps required.

## Accessibility & privacy
- Keyboard-friendly buttons and visible focus states.
- High-contrast theme with optional dark mode toggle.
- All data (history, mistakes, feedback) stays in `localStorage` on the device.
