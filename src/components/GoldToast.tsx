import { useToastStore } from '@store/useToastStore'

export default function GoldToast(){
  const { message, hide } = useToastStore()
  if (!message) return null
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="btn-gold px-5 py-3 rounded-xl shadow-gold gold-toast" role="status" onClick={hide}>
        {message}
      </div>
    </div>
  )
}
