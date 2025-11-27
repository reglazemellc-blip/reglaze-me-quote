import React, { useState } from 'react'

function TestUI() {
  const [clientName, setClientName] = useState('')

  return (
  <div className="p-4">
    <h2 className="text-2xl font-bold text-[#e8d487] mb-6">Test Form</h2>

  <form className="space-y-4 bg-black/40 border border-[#2a2414] rounded-xl p-6 max-w-md">
    <div>
      <label htmlFor="clientName" className="block text-sm font-medium text-[#e8d487] mb-2">
        Client Name
      </label>
      <input
        id="clientName"
        type="text"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="w-full px-4 py-2 bg-black/30 border border-[#2a2414] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e8d487] focus:border-[#e8d487]"
        placeholder="Enter client name"
      />
    </div>
    <button 
      type="submit"
      className="px-4 py-2 bg-[#e8d487] text-black rounded-lg hover:opacity-90 transition font-medium"
    >
      Submit
    </button>
  </form>

  </div>
);

}

export default TestUI
