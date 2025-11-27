import React from 'react'

interface InputFieldProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
}

export default function InputField({ label, id, value, onChange }: InputFieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 shadow-sm px-3 py-2
                   focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  )
}
