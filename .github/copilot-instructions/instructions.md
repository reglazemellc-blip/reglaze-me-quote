# 🚀 **ReGlaze Me — Copilot v7 Instructions**
### **Purpose**
These rules configure GitHub Copilot (Cloud Agent + Local Agent) to follow the ReGlaze Me v7 architecture for code generation, refactoring, UI work, Firestore operations, and PDF / quote / invoice logic.

---

## **1. Tech Stack**
- React + TypeScript  
- Vite  
- TailwindCSS  
- Zustand (global stores)  
- Firestore (CRUD, listeners, collections: clients, quotes, invoices, contracts, services, settings)  
- HTML → PDF generation (jsPDF or html2pdf)  
- ShadCN components  
- React Router

---

## **2. Core App Modules**
Copilot must preserve and follow these patterns:

### **Quotes System**
- Auto-ID format: `q-YYYYMMDD-####`
- Manual line-item input
- Yes/No subservices from catalog
- Auto subtotal, tax, discount, total
- Status flags: Draft, Sent, Viewed, Signed, Converted
- PDF export that visually matches UI
- Digital signature modal (`signature_pad`)
- Convert Quote → Invoice

### **Invoices System**
- Auto-ID: `inv-YYYYMMDD-####`
- Pulls data from quote
- Tracks payments + balance
- PDF export
- Status: Unpaid, Partial, Paid, Overdue

### **Contracts System**
- Templates editable in admin  
- Pulls client + service + pricing data from quote/invoice  
- Requires e-signature before job start  
- PDF export

### **Service Catalog**
- Stored in `/src/data/services.json`
- Main categories + subservices
- Each subservice: `{ name, price, warning?, default? }`
- Admin UI allows:
  - Add/edit/remove services  
  - Edit warnings  
  - Reorder items  
- Changes persist

---

## **3. Global Admin/Edit Mode**
- Toggle in header  
- Editable settings:
  - Business info  
  - Colors/theme  
  - PDF header / watermark  
  - Tax rate  
  - Labels + text  
- Settings persist (Firestore `settings` or local storage)

---

## **4. PDF Rules**
- PDF layout **must match UI**
- Must include:
  - Header & logo  
  - Subservice warnings  
  - Digital signature  
- Filename format:
  ```
  <docId>_<clientName>.pdf
  ```

---

## **5. Navigation**
- Dashboard  
- Clients  
- Quotes  
- Invoices  
- Contracts  
- Catalog  
- Settings

---

## **6. Persistence Rules**
### Required Firestore Collections
```
clients
quotes
invoices
contracts
services
settings
```

### Data Safety Rules
- Use typed converters  
- Always `await` Firestore promises  
- Never assume a document exists  
- Always check `.exists()`  

---

## **7. Cloud Agent Behavioral Rules**
### Allowed outputs
- React components  
- Zustand stores  
- Firestore functions  
- Tailwind UI  
- PDF builders  
- Business logic for quotes / invoices / contracts  
- Admin settings panels  

### Forbidden outputs
- No project rewrite  
- No deleting logic unless requested  
- No guesswork about schemas  
- No code outside `/src`  
- No renaming routes or folders unless asked  

---

## **8. Supported Slash Commands**
Copilot must respond to:

```
/refactor
/ui
/store
/firestore
/pdf
/contract
/quote
/invoice
/fix
/add-page
```

Each command triggers the appropriate domain behavior.

---

## **9. UI/Styling Rules**
- Tailwind only  
- ShadCN for components  
- Mobile responsive by default  
- Use consistent spacing & border-radius  
- Use existing classes instead of inventing new ones  

---

## **10. Quality Requirements**
- No TypeScript errors  
- No unused imports  
- Keep existing folder structure  
- Use descriptive names  
- Never break build or routing  
- No random color codes  
- Keep logic modular  

---

# ✔️ End of v7 Instructions
