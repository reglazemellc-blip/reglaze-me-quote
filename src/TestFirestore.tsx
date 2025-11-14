import { useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase' // if this path is wrong, tell me your folder layout

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
