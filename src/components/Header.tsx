import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSettingsStore } from '@store/useSettingsStore'
import ThemeEditor from './ThemeEditor'
import { useEffect, useState } from 'react'
import { exportElementToPDF } from '@utils/pdf'
import { useLayoutStore } from '@store/useLayoutStore'

export default function Header() {
  const { settings, init } = useSettingsStore()
  const [open, setOpen] = useState(false)
  useEffect(() => { init() }, [init])
  const location = useLocation()
  const { editMode, toggle } = useLayoutStore()
  async function handleExport() {
    const el = document.getElementById('quote-preview') as HTMLElement | null
    if (el) await exportElementToPDF(el, 'quote.pdf')
  }
  return (
    <header className="border-b" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded logo-glow logo-parallax" />
          <Link to="/" className="font-semibold text-lg" style={{ color: 'var(--color-link)' }}>ReGlaze Me Quote</Link>
        </div>
        <nav className="top-nav flex items-center gap-2 text-sm">
          <IconLink to="/" label="Dashboard" svg={HomeIcon} />
          <IconLink to="/clients" label="Clients" svg={UsersIcon} />
          <IconLink to="/quotes/new" label="Quotes" svg={DocumentIcon} />
          <IconLink to="/settings" label="Settings" svg={CogIcon} />
        </nav>
        <div className="flex items-center gap-2">
          <button className="btn-icon icon-gold" title="Export PDF" onClick={handleExport}>
            {DownloadIcon()}
          </button>
          <button className="btn-icon icon-gold" title="Edit Mode" onClick={()=>setOpen(true)}>
            {AdjustmentsIcon()}
          </button>
          <button className="btn-icon icon-gold" title="Edit Layout" onClick={toggle}>
            {PencilSquareIcon()} { /* layout toggle */ }
          </button>
        </div>
      </div>
      <div style={{ height: '2px', background: 'linear-gradient(90deg,#ffd700 0%,#b8860b 100%)' }} />
      {open && <ThemeEditor onClose={()=>setOpen(false)} />}
    </header>
  )
}

function IconLink({ to, label, svg }:{ to:string; label:string; svg:()=>JSX.Element }){
  return (
    <NavLink to={to} className={({isActive}) => `${isActive ? 'active' : ''}`}>
      <span className="inline-flex items-center gap-2">
        {svg()}<span className="hidden sm:inline">{label}</span>
      </span>
    </NavLink>
  )
}

function HomeIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="grad-home" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d"/>
          <stop offset="100%" stopColor="#d4af37"/>
        </linearGradient>
      </defs>
      <path d="M3 10.5 12 4l9 6.5V21a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1v-10.5z" stroke="url(#grad-home)"/>
    </svg>
  )
}
function UsersIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d"/>
          <stop offset="100%" stopColor="#d4af37"/>
        </linearGradient>
      </defs>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="url(#grad-users)"/>
      <circle cx="9" cy="7" r="4" stroke="url(#grad-users)"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="url(#grad-users)"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="url(#grad-users)"/>
    </svg>
  )
}
function DocumentIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="grad-doc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d"/>
          <stop offset="100%" stopColor="#d4af37"/>
        </linearGradient>
      </defs>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="url(#grad-doc)"/>
      <path d="M14 2v6h6" stroke="url(#grad-doc)"/>
    </svg>
  )
}
function CogIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="grad-cog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d"/>
          <stop offset="100%" stopColor="#d4af37"/>
        </linearGradient>
      </defs>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c0 .66.38 1.26 1 1.51.58.24 1.24.1 1.7-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10c0 .66.38 1.26 1 1.51.58.24 1.24.1 1.7-.33" stroke="url(#grad-cog)"/>
      <circle cx="12" cy="12" r="3" stroke="url(#grad-cog)"/>
    </svg>
  )
}
function DownloadIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="grad-dl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d"/>
          <stop offset="100%" stopColor="#d4af37"/>
        </linearGradient>
      </defs>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="url(#grad-dl)"/>
      <path d="M7 10l5 5 5-5" stroke="url(#grad-dl)"/>
      <path d="M12 15V3" stroke="url(#grad-dl)"/>
    </svg>
  )
}
function AdjustmentsIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="grad-adj" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d"/>
          <stop offset="100%" stopColor="#d4af37"/>
        </linearGradient>
      </defs>
      <path d="M6 3v12" stroke="url(#grad-adj)"/><path d="M6 19v2" stroke="url(#grad-adj)"/>
      <circle cx="6" cy="15" r="2" stroke="url(#grad-adj)"/>
      <path d="M12 3v2" stroke="url(#grad-adj)"/><path d="M12 9v12" stroke="url(#grad-adj)"/>
      <circle cx="12" cy="7" r="2" stroke="url(#grad-adj)"/>
      <path d="M18 3v6" stroke="url(#grad-adj)"/><path d="M18 15v6" stroke="url(#grad-adj)"/>
      <circle cx="18" cy="13" r="2" stroke="url(#grad-adj)"/>
    </svg>
  )
}
function PencilSquareIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M12 20h9" stroke="currentColor"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor"/></svg>
  )
}
