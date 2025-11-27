# ReGlaze Component Pattern

Copilot must generate React components that follow this exact structure, based on the example below.

---

## 📌 Base Component Template (STRICT)

```tsx
import { useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

function TestFirestore() {
  useEffect(() => {
    async function run() {
      const snap = await getDocs(collection(db, 'clients'))
      console.log('TEST CLIENTS:', snap.docs.map(d => d.data()))
    }
    run()
  }, [])

  return null
}

export default TestFirestore
