import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSettingsStore } from '@store/useSettingsStore'
import { useConfigStore } from '@store/useConfigStore'
import ThemeEditor from './ThemeEditor'
import { useEffect, useState } from 'react'
import { exportElementToPDF } from '@utils/pdf'
import { useLayoutStore } from '@store/useLayoutStore'

type IconLinkProps = {
  to: string
  label: string
  svg: () => JSX.Element
}
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'


export default function Header(): JSX.Element {
  const { settings, init } = useSettingsStore()
  const { config } = useConfigStore()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
useEffect(() => {
  if (mobileOpen) window.scrollTo({ top: 0, behavior: 'smooth' });
}, [mobileOpen]);

useEffect(() => {
  if (mobileOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, [mobileOpen]);

  useEffect(() => {
    init()
  }, [init])

  const location = useLocation()
  const { editMode, toggle } = useLayoutStore()

  async function handleExport() {
    const el = document.getElementById('quote-preview')
    if (el) await exportElementToPDF(el, 'quote.pdf')
  }

  // Use config labels with proper fallbacks
  const appName = config?.labels?.appName || 'ReGlaze Me LLC'
  const navDashboard = config?.labels?.navDashboard || 'Dashboard'
  const navClients = config?.labels?.navClients || 'Clients'
  const navQuotes = config?.labels?.navQuotes || 'Quotes'
  const navInvoices = config?.labels?.navInvoices || 'Invoices'
  const navContracts = config?.labels?.navContracts || 'Contracts'
  const navCatalog = config?.labels?.navCatalog || 'Services'
  const navSettings = config?.labels?.navSettings || 'Settings'

  // Load logo from businessProfile store with fallback
  const logoSrc = config?.businessProfile?.logo || '/logo.png'

  return (
  <>
    <header
      className="
        border-b 
        backdrop-blur-lg
        shadow-[0_0_25px_rgba(255,215,0,0.08)]
        z-[3000]
      "
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between flex-wrap">

        {/* MOBILE MENU BUTTON */}
        <button className="md:hidden p-2 text-[#e8d487]" onClick={() => setMobileOpen(!mobileOpen)}>
          ☰
        </button>

        {/* LEFT — LOGO + TITLE */}
        <div className="flex items-center gap-4">
          <img
            src={logoSrc}
            alt="Logo"
            className="w-12 rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.25)]"
            style={{ maxHeight: '48px', objectFit: 'contain' }}
          />
          <Link
            to="/"
            className="text-xl font-semibold tracking-wide"
            style={{ color: 'var(--color-primary)' }}
          >
            {appName}
          </Link>
        </div>

        {/* CENTER NAV */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <IconLink to="/" label={navDashboard} svg={HomeIcon} />
          <IconLink to="/clients" label={navClients} svg={UsersIcon} />
          <IconLink to="/quotes" label={navQuotes} svg={DocumentIcon} />
          <IconLink to="/invoices" label={navInvoices} svg={InvoiceIcon} />
          <IconLink to="/contracts" label={navContracts} svg={ContractIcon} />
          <IconLink to="/services" label={navCatalog} svg={ServicesIcon} />
          <IconLink to="/settings" label={navSettings} svg={CogIcon} />
        </nav>

        {/* RIGHT ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          <button className="header-icon-btn" title="Export PDF" onClick={handleExport}>
            {DownloadIcon()}
          </button>

          <button
            className="header-icon-btn"
            title="Theme Settings"
            onClick={() => setOpen(true)}
          >
            {AdjustmentsIcon()}
          </button>

          <button
            className="header-icon-btn"
            title="Toggle Layout Edit"
            onClick={toggle}
          >
            {PencilSquareIcon()}
          </button>
        </div>
      </div>

      {/* GOLD DIVIDER */}
      <div
        style={{
          height: '2px',
          background: 'linear-gradient(90deg,#ffd700 0%,#b8860b 100%)'
        }}
      />
    </header>

    {/* MOBILE MENU OUTSIDE HEADER FIXES ALL STACKING ISSUES */}
    {/* MOBILE MENU + BACKDROP */}
<AnimatePresence initial={false} mode="wait">
  {mobileOpen ? (
    <>
      {/* BACKDROP */}
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[4000] pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setMobileOpen(false)}
      />

      {/* MOBILE MENU */}
      <motion.div
      variants={{ open: { transition: { staggerChildren: 0.08 } } }}

        key="mobile-menu"
        className="fixed top-0 left-0 h-full w-full px-6 py-8 flex flex-col gap-4 
                   bg-[var(--color-surface)] z-[5000] pointer-events-auto"
        initial={{ opacity: 0, x: 80, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 80, y: -10 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}

      >
        <div className="flex flex-col gap-4">
 <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>


    <IconLink to="/" label={navDashboard} svg={HomeIcon} />
  </motion.div>


 <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>

    <IconLink to="/clients" label={navClients} svg={UsersIcon} />
  </motion.div>

  <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>

    <IconLink to="/quotes" label={navQuotes} svg={DocumentIcon} />
  </motion.div>

  <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>
    <IconLink to="/invoices" label={navInvoices} svg={InvoiceIcon} />
  </motion.div>

  <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>
    <IconLink to="/contracts" label={navContracts} svg={ContractIcon} />
  </motion.div>

  <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>
    <IconLink to="/services" label={navCatalog} svg={ServicesIcon} />
  </motion.div>

  <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} onClick={() => setMobileOpen(false)}>
    <IconLink to="/settings" label={navSettings} svg={CogIcon} />
  </motion.div>
</div>

      </motion.div>
    </>
  ) : null}
</AnimatePresence>


    {open && <ThemeEditor onClose={() => setOpen(false)} />}
  </>
);

}


/* --------------------------------------------------
   NAV LINK COMPONENT
-------------------------------------------------- */
function IconLink({ to, label, svg: Svg }: IconLinkProps): JSX.Element {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
          px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-2
          ${
            isActive
              ? 'text-[#fff1a8] font-semibold'
              : 'text-[#e8d487]/80 hover:text-[#fff1a8]'
          }
        `
      }
    >
      <Svg />
      <span className="inline">{label}</span>

    </NavLink>
  )
}

/* --------------------------------------------------
   ICONS (Gradient Gold)
-------------------------------------------------- */

function HomeIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-home" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M3 10.5 12 4l9 6.5V21a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1v-10.5z"
        stroke="url(#gold-home)"
      />
    </svg>
  )
}

function UsersIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-users" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="url(#gold-users)" />
      <circle cx="9" cy="7" r="4" stroke="url(#gold-users)" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="url(#gold-users)" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="url(#gold-users)" />
    </svg>
  )
}

function DocumentIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-doc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="url(#gold-doc)"
      />
      <path d="M14 2v6h6" stroke="url(#gold-doc)" />
    </svg>
  )
}

function CogIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-cog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.66 0 1.26-.38 1.51-1 .24-.58.1-1.24-.33-1.7l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10c.66 0 1.26-.38 1.51-1V3a2 2 0 0 1 4 0v.09c0 .66.38 1.26 1 1.51.58.24 1.24.1 1.7-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10c0 .66.38 1.26 1 1.51.58.24 1.24.1 1.7-.33"
        stroke="url(#gold-cog)"
      />
      <circle cx="12" cy="12" r="3" stroke="url(#gold-cog)" />
    </svg>
  )
}

function DownloadIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-dl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="url(#gold-dl)" />
      <path d="M7 10l5 5 5-5" stroke="url(#gold-dl)" />
      <path d="M12 15V3" stroke="url(#gold-dl)" />
    </svg>
  )
}

function AdjustmentsIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-adj" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path d="M6 3v12" stroke="url(#gold-adj)" />
      <path d="M6 19v2" stroke="url(#gold-adj)" />
      <circle cx="6" cy="15" r="2" stroke="url(#gold-adj)" />
      <path d="M12 3v2" stroke="url(#gold-adj)" />
      <path d="M12 9v12" stroke="url(#gold-adj)" />
      <circle cx="12" cy="7" r="2" stroke="url(#gold-adj)" />
      <path d="M18 3v6" stroke="url(#gold-adj)" />
      <path d="M18 15v6" stroke="url(#gold-adj)" />
      <circle cx="18" cy="13" r="2" stroke="url(#gold-adj)" />
    </svg>
  )
}

function PencilSquareIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <path d="M12 20h9" stroke="currentColor" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
      />
    </svg>
  )
}

function ServicesIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-services" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="url(#gold-services)"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InvoiceIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-invoice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="url(#gold-invoice)"
      />
      <path d="M14 2v6h6" stroke="url(#gold-invoice)" />
      <path d="M8 13h8" stroke="url(#gold-invoice)" />
      <path d="M8 17h8" stroke="url(#gold-invoice)" />
      <circle cx="10" cy="10" r="0.5" fill="url(#gold-invoice)" />
    </svg>
  );
}

function ContractIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <defs>
        <linearGradient id="gold-contract" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe18d" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="url(#gold-contract)"
      />
      <path d="M14 2v6h6" stroke="url(#gold-contract)" />
      <path d="M9 12h6" stroke="url(#gold-contract)" />
      <path d="M9 16h6" stroke="url(#gold-contract)" />
      <path d="M9 20h3" stroke="url(#gold-contract)" />
    </svg>
  );
}
