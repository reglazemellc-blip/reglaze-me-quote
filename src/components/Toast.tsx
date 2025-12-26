import { useEffect } from "react";

export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Check if message contains validation errors (newlines or multiple sentences)
  const isError = message.includes('\n') || message.toLowerCase().includes('required') || 
                  message.toLowerCase().includes('invalid') || message.toLowerCase().includes('cannot') ||
                  message.toLowerCase().includes('failed') || message.toLowerCase().includes('error');
  
  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 px-6 py-4 rounded-lg
        text-white text-sm shadow-2xl z-[10001]
        border-2 max-w-md w-full mx-4
        animate-fade-in-up
        ${isError ? 'bg-red-600/95 border-red-400' : 'bg-black/90 border-white/20'}
      `}
    >
      <div className="font-semibold mb-1">{isError ? '⚠️ Validation Error' : '✓ Success'}</div>
      <div className="whitespace-pre-line leading-relaxed">{message}</div>
    </div>
  );
}
