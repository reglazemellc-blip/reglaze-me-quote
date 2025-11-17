import { Search } from "lucide-react";

type Props = {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
};

export default function SearchBar({ placeholder, value = "", onChange }: Props) {
  return (
    <div className="relative w-full">
      {/* ICON */}
      <Search
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e8d487]/70 pointer-events-none"
      />

      {/* INPUT */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        
        // *** HARD-FORCE THE SPACING (THIS CANNOT FAIL) ***
        style={{ paddingLeft: "2.2rem" }}
        
        className="
          w-full
          h-11
          bg-[#0f0f0f]
          border border-[#2a2a2a]
          rounded-lg
          text-[#f1f1f1]
          placeholder:text-gray-500
          focus:outline-none
          focus:border-[#e8d487]
          shadow-[0_0_10px_rgba(0,0,0,0.2)]
        "
      />
    </div>
  );
}
