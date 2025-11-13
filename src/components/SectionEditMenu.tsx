import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLayoutStore } from '@store/useLayoutStore'

export default function SectionEditMenu({ page, sectionKey, defaultTitle }:{ page:string; sectionKey:string; defaultTitle:string }){
  const { editMode, rename, remove, add, section } = useLayoutStore()
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(section(page, sectionKey, defaultTitle).title)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(()=>{
    if (!open) return
    setTitle(section(page, sectionKey, defaultTitle).title)
  }, [open, page, sectionKey, defaultTitle, section])

  if (!editMode) return null

  const menu = open ? createPortal((
    <>
      <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={()=>setOpen(false)} />
      <div className="fixed z-[9999] card p-3 w-64" style={getMenuPosition(buttonRef.current)}>
        {!renaming ? (
          <div className="space-y-2">
            <button className="btn btn-outline w-full" onClick={()=> setRenaming(true)}>Rename Section</button>
            <button className="btn btn-outline w-full" onClick={()=>{
              const name = prompt('New section name?')
              if (name && name.trim()) add(page, name.trim())
              setOpen(false)
            }}>Add New Section</button>
            <button className="btn btn-outline w-full" onClick={()=>{
              if (confirm('Remove this section? You can restore it later.')) remove(page, sectionKey)
              setOpen(false)
            }}>Remove Section</button>
            <button className="btn btn-outline w-full" onClick={()=>setOpen(false)}>Cancel</button>
          </div>
        ) : (
          <div className="space-y-2">
            <input className="input w-full" value={title} onChange={e=>setTitle(e.target.value)} />
            <div className="flex items-center gap-2">
              <button className="btn btn-gold" onClick={()=>{
                if (!title.trim()) return
                rename(page, sectionKey, title.trim())
                setRenaming(false)
                setOpen(false)
              }}>Save</button>
              <button className="btn btn-outline" onClick={()=>{ setRenaming(false); setTitle(section(page, sectionKey, defaultTitle).title) }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  ), document.body) : null

  return (
    <>
      <button ref={buttonRef} title="Edit Section" className="btn-icon icon-gold" onClick={()=>setOpen(v=>!v)} aria-label="Edit section">
        {PencilIcon()}
      </button>
      {menu}
    </>
  )
}

function getMenuPosition(btn: HTMLButtonElement | null){
  if (!btn) return { top: '4rem', right: '1rem' }
  const rect = btn.getBoundingClientRect()
  return { top: `${rect.bottom + window.scrollY + 8}px`, left: `${Math.min(window.innerWidth - 280, rect.right - 240)}px` }
}

function PencilIcon(){
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M12 20h9" stroke="currentColor"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor"/></svg>
  )
}
