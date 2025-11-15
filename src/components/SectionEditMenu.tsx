import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLayoutStore } from '@store/useLayoutStore'

type Props = {
  page: string
  sectionKey: string
  defaultTitle: string
}

export default function SectionEditMenu({ page, sectionKey, defaultTitle }: Props): JSX.Element | null {
  const { editMode, rename, remove, add, section } = useLayoutStore()
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(section(page, sectionKey, defaultTitle).title)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setTitle(section(page, sectionKey, defaultTitle).title)
  }, [open, page, sectionKey, defaultTitle, section])

  if (!editMode) return null

  const menu = open
    ? createPortal(
        <>
          {/* BACKDROP */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={() => setOpen(false)}
          />

          {/* MENU CARD */}
          <div
            className="
              fixed z-[9999] p-4 w-72 rounded-2xl
              bg-[#151515]
              border border-[#2a2a2a]
              shadow-[0_0_25px_rgba(255,215,0,0.25)]
              text-[#e8d487]
            "
            style={getMenuPosition(buttonRef.current)}
          >
            {/* MAIN MENU */}
            {!renaming ? (
              <div className="space-y-3">
                <button
                  className="
                    w-full px-3 py-2 rounded-lg
                    border border-[#444]
                    hover:border-[#b8860b]
                    hover:text-[#fff1a8]
                    transition-all
                  "
                  onClick={() => setRenaming(true)}
                >
                  Rename Section
                </button>

                <button
                  className="
                    w-full px-3 py-2 rounded-lg
                    border border-[#444]
                    hover:border-[#b8860b]
                    hover:text-[#fff1a8]
                    transition-all
                  "
                  onClick={() => {
                    const name = prompt('New section name?')
                    if (name && name.trim()) add(page, name.trim())
                    setOpen(false)
                  }}
                >
                  Add New Section
                </button>

                <button
                  className="
                    w-full px-3 py-2 rounded-lg
                    border border-[#444]
                    hover:border-[#b8860b]
                    hover:text-[#ff6666]
                    transition-all
                  "
                  onClick={() => {
                    if (confirm('Remove this section? You can restore it later.'))
                      remove(page, sectionKey)
                    setOpen(false)
                  }}
                >
                  Remove Section
                </button>

                <button
                  className="
                    w-full px-3 py-2 rounded-lg
                    border border-[#444]
                    hover:border-[#b8860b]
                    hover:text-[#fff1a8]
                    transition-all
                  "
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* RENAME MODE */
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="
                    w-full px-3 py-2 rounded-lg
                    bg-[#0f0f0f]
                    border border-[#2a2a2a]
                    text-[#e8d487]
                    focus:outline-none
                    shadow-[0_0_12px_rgba(255,215,0,0.3)]
                    transition-all
                  "
                />

                <div className="flex items-center gap-2">
                  <button
                    className="
                      flex-1 px-3 py-2 rounded-lg font-semibold
                      bg-gradient-to-b from-[#ffd700] to-[#b8860b]
                      text-black
                      shadow-[0_0_15px_rgba(255,215,0,0.4)]
                      hover:opacity-90
                      transition-all
                    "
                    onClick={() => {
                      if (!title.trim()) return
                      rename(page, sectionKey, title.trim())
                      setRenaming(false)
                      setOpen(false)
                    }}
                  >
                    Save
                  </button>

                  <button
                    className="
                      flex-1 px-3 py-2 rounded-lg
                      border border-[#444]
                      text-[#e8d487]/70
                      hover:border-[#b8860b]
                      hover:text-[#fff1a8]
                      transition-all
                    "
                    onClick={() => {
                      setRenaming(false)
                      setTitle(section(page, sectionKey, defaultTitle).title)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )
    : null

  return (
    <>
      <button
        ref={buttonRef}
        title="Edit Section"
        aria-label="Edit section"
        className="
          p-2 rounded-lg
          text-[#e8d487]
          hover:text-[#fff1a8]
          hover:bg-[#1a1a1a]
          transition-all
        "
        onClick={() => setOpen((v) => !v)}
      >
        {PencilIcon()}
      </button>

      {menu}
    </>
  )
}

/* --------------------------------------------------
   MENU POSITIONING
-------------------------------------------------- */
function getMenuPosition(btn: HTMLButtonElement | null) {
  if (!btn) return { top: '4rem', right: '1rem' }

  const rect = btn.getBoundingClientRect()

  return {
    top: `${rect.bottom + window.scrollY + 10}px`,
    left: `${Math.min(window.innerWidth - 300, rect.right - 260)}px`,
  }
}

/* --------------------------------------------------
   ICON
-------------------------------------------------- */
function PencilIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <path d="M12 20h9" stroke="currentColor" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
      />
    </svg>
  )
}
