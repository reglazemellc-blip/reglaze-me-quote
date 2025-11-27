# ReGlaze Me – Copilot Coding Instructions

Copilot must follow these rules when generating code:

## Architecture
- Use React + TypeScript + Vite.
- Always create components as `.tsx` files.
- Use Zustand stores for all global state.
- Use Firestore for data storage with typed CRUD functions.
- Maintain folder structure:
  - src/components
  - src/pages
  - src/stores
  - src/services
  - src/types
  - src/utils

## React Components
- Always return semantic JSX.
- Always include proper TypeScript interfaces for props.
- Always use Tailwind classes for styling, matching the ReGlaze theme.
- Use functional components only.
- Write clean, readable, minimal JSX markup.

## Zustand Stores
- Store files must follow the pattern:
  - `import { create } from 'zustand'`
- Each store must export:
  - Type interface
  - Store creation function
  - Selectors
- Never inline-anonymous functions; always name actions.

## Firestore
- CRUD functions must be typed.
- Use async/await.
- All document IDs must be strings.
- Use collection refs: `collection(db, 'clients')` etc.

## UI/UX
- Never write inline style attributes.
- Always use Tailwind.
- Follow spacing conventions:
  - `p-4`, `px-3`, `py-2`, `rounded-xl`
- Drawer/Modal flows must follow the ReGlaze pattern:
  - `openClientDrawer`
  - `openServiceDrawer`
  - etc.

## Autocomplete / Select Components
- Use the ReGlaze autocomplete pattern:
  - Controlled input
  - No overlapping dropdown
  - Clear focus + blur behavior

## Quote Editor
- Follow the existing structure in:
  - `src/pages/quote-editor`
- Use line item definitions:
  - description
  - quantity
  - price
  - total
- Automatically calculate totals.

## Code Quality
- No “any” types.
- Use real interfaces.
- Use arrow functions.
- Keep imports clean and grouped.
- Prefer readability over cleverness.
