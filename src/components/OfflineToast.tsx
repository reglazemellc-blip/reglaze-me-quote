import { useEffect, useState } from 'react'

export default function OfflineToast(){
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(()=>{
    const on = ()=>setOnline(true)
    const off = ()=>setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return ()=>{ window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  },[])
  if (online) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-900 px-4 py-2 rounded-md shadow">
      You are offline. Changes are saved locally.
    </div>
  )
}

