import { useToastStore } from '@store/useToastStore'

export default function GoldToast() {
  const { message, hide } = useToastStore()
  if (!message) return null

  return (
    <div className="fixed top-6 right-6 z-[999]">
      <div
        onClick={hide}
        role="status"
        className="
          bg-[#151515] 
          border border-[#2a2a2a] 
          text-[#e8d487]
          px-6 py-4 
          rounded-2xl 
          shadow-[0_0_15px_rgba(255,215,0,0.25)]
          cursor-pointer 
          font-medium 
          transition-all 
          duration-200
          hover:shadow-[0_0_25px_rgba(255,215,0,0.45)]
          hover:text-[#fff1a8]
        "
      >
        {message}
      </div>
    </div>
  )
}
