# ReGlaze UI Component Pattern

Copilot must generate UI components using the exact ReGlaze layout, spacing, and styling conventions listed below.

---

## 📌 Layout Rules

- Always wrap UI in a top-level `<div className="p-4">` unless the user specifies otherwise.
- Use ReGlaze spacing:
  - `p-4`, `px-4`, `py-3`, `mb-4`, `gap-4`
  - Rounded corners: `rounded-xl`
  - Containers: `shadow-sm bg-white rounded-xl p-4`
- Always use Tailwind classes—never inline CSS.

---

## 📌 Typography & Color

- Use:
  - `text-gray-900` for main text
  - `text-gray-700` for labels
  - `text-sm font-medium` for form labels
- Buttons:  
  ```html
  className="px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90"
