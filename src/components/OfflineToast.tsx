import { useEffect, useState } from 'react'

export default function OfflineToast(): JSX.Element | null {
  const [online, setOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2
        px-6 py-3 rounded-2xl
        text-[#e8d487]
        bg-[#151515]
        border border-[#2a2a2a]
        shadow-[0_0_18px_rgba(255,215,0,0.25)]
        text-sm font-medium
        z-50
        animate-pulse
      "
    >
      You are offline. Changes are saved locally.
    </div>
  )
}
