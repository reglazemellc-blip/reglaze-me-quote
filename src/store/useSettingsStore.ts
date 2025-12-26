import { create } from 'zustand'
import { auth, db as firestoreDb } from '../firebase'
import { doc, setDoc } from 'firebase/firestore'
import { db, getOrInitSettings, type Settings } from '@db/index'

type SettingsState = {
  settings: Settings | null
  loading: boolean
  init: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
  reset: () => Promise<void>
  exportJSON: () => Promise<Blob>
  importJSON: (data: any) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,

  // Load settings from Dexie (local DB)
  init: async () => {
    if (!auth.currentUser) {
  set({ loading: false })
  return
}

const s = await getOrInitSettings()

    applyTheme(s)
    set({ settings: s, loading: false })
  },

  // Update settings in Dexie and Firestore
  update: async (patch) => {
    const current = get().settings!
    const next: Settings = { ...current, ...patch }
    await db.settings.put(next)
    // Also sync to Firestore
    const settingsRef = doc(firestoreDb, 'settings', 'settings')
    await setDoc(settingsRef, next, { merge: true })
    applyTheme(next)
    set({ settings: next })
  },

  // Wipe local DB and reload page
  reset: async () => {
    await db.delete()
    window.location.reload()
  },

  // Export all data as JSON
  exportJSON: async () => {
    const [clients, quotes, settings, catalog] = await Promise.all([
      db.clients.toArray(),
      db.quotes.toArray(),
      db.settings.toArray(),
      db.catalog.toArray(),
    ])

    const payload = {
      clients,
      quotes,
      settings,
      catalog,
      exportedAt: Date.now(),
    }

    return new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
  },

  // Import JSON backup into Dexie
  importJSON: async (data: any) => {
    await db.transaction(
      'rw',
      db.clients,
      db.quotes,
      db.settings,
      db.catalog,
      async () => {
        await db.clients.clear()
        await db.quotes.clear()
        await db.settings.clear()
        await db.catalog.clear()

        if (data.clients) await db.clients.bulkAdd(data.clients)
        if (data.quotes) await db.quotes.bulkAdd(data.quotes)
        if (data.settings) await db.settings.bulkAdd(data.settings)
        if (data.catalog) await db.catalog.bulkAdd(data.catalog)
      },
    )

    const s = await getOrInitSettings()
    applyTheme(s)
    set({ settings: s })
  },
}))

function applyTheme(s: Settings) {
  const r = document.documentElement
  r.style.setProperty('--color-primary', s.theme.primary)
  r.style.setProperty('--color-secondary', s.theme.secondary)
  r.style.setProperty('--color-accent1', s.theme.accent1)
  r.style.setProperty('--color-accent2', s.theme.accent2)
  r.style.setProperty('--color-background', s.theme.background)
}
