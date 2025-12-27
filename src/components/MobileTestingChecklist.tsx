/**
 * Mobile Testing Checklist
 * Use this component to manually test mobile responsiveness
 * Remove this file before production
 */

import { useState } from 'react'

interface TestItem {
  id: string
  label: string
  page: string
  instructions: string
  passed: boolean | null
}

export default function MobileTestingChecklist() {
  const [tests, setTests] = useState<TestItem[]>([
    {
      id: 'calendar-tap',
      label: 'Calendar day cells are easy to tap',
      page: '/calendar',
      instructions: 'Go to Calendar page. Try tapping different dates. Should not miss or tap wrong date.',
      passed: null,
    },
    {
      id: 'photo-scroll',
      label: 'Photo galleries scroll horizontally',
      page: '/clients/[id]',
      instructions: 'Go to a client with photos. Swipe left/right on photo gallery. Should scroll smoothly.',
      passed: null,
    },
    {
      id: 'dropdown-select',
      label: 'Dropdowns are usable',
      page: '/clients',
      instructions: 'Try using "Sort by" dropdown. Should open without issues, easy to select options.',
      passed: null,
    },
    {
      id: 'onboarding-mobile',
      label: 'Onboarding wizard fits screen',
      page: '/',
      instructions: 'Clear localStorage, reload. Onboarding should fill screen, text readable, buttons reachable.',
      passed: null,
    },
    {
      id: 'search-mobile',
      label: 'Search bars work on mobile',
      page: '/clients',
      instructions: 'Tap search bar. Keyboard should not cover input. Type should work without zoom.',
      passed: null,
    },
    {
      id: 'help-menu-mobile',
      label: 'Help menu opens correctly',
      page: 'any',
      instructions: 'Tap ? icon. Dropdown should appear above all content, easy to tap options.',
      passed: null,
    },
    {
      id: 'zfold-cover',
      label: 'Z Fold cover screen usable',
      page: 'all',
      instructions: 'Resize to 374px width. Check no horizontal scroll, all content fits, buttons work.',
      passed: null,
    },
  ])

  const [isMinimized, setIsMinimized] = useState(false)

  const updateTest = (id: string, passed: boolean) => {
    setTests(tests.map(t => t.id === id ? { ...t, passed } : t))
  }

  const passedCount = tests.filter(t => t.passed === true).length
  const failedCount = tests.filter(t => t.passed === false).length
  const totalCount = tests.length

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[200000] bg-[#1a1a0f] border-2 border-[#e8d487] rounded-lg p-3 shadow-2xl hover:bg-[#2a2414] transition-colors"
      >
        <span className="text-lg">📱</span>
        <span className="ml-2 text-sm text-[#e8d487] font-medium">
          {passedCount}/{totalCount}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200000] w-80 bg-[#1a1a0f] border-2 border-[#e8d487] rounded-lg shadow-2xl">
      <div className="p-4 border-b border-[#2a2414] flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#e8d487]">📱 Mobile Testing</h3>
          <p className="text-xs text-gray-400 mt-1">
            {passedCount}/{totalCount} passed · {failedCount} failed
          </p>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-white p-1"
        >
          ➖
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {tests.map(test => (
          <div key={test.id} className="border border-[#2a2414] rounded p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{test.label}</p>
                <p className="text-xs text-gray-400 mt-1">Page: {test.page}</p>
              </div>
              {test.passed !== null && (
                <span className="text-lg">
                  {test.passed ? '✅' : '❌'}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-300 bg-black/20 p-2 rounded">
              {test.instructions}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => updateTest(test.id, true)}
                className={`flex-1 text-xs py-1 rounded ${
                  test.passed === true
                    ? 'bg-green-600 text-white'
                    : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
                }`}
              >
                Pass ✓
              </button>
              <button
                onClick={() => updateTest(test.id, false)}
                className={`flex-1 text-xs py-1 rounded ${
                  test.passed === false
                    ? 'bg-red-600 text-white'
                    : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                }`}
              >
                Fail ✗
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[#2a2414] text-xs text-gray-400">
        <p>💡 Test on Chrome DevTools (F12 → Toggle device toolbar)</p>
        <p className="mt-1">Devices: iPhone 12 Pro (390x844) • Z Fold Cover (374x800)</p>
      </div>
    </div>
  )
}
