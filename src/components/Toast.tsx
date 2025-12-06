import { useEffect } from "react";

export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="
        fixed bottom-6 right-6 px-4 py-3 rounded-lg
        bg-black/80 text-white text-sm shadow-lg
        border border-white/10
        animate-fade-in-up
      "
    >
      {message}
    </div>
  );
}
