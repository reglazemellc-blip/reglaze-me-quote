/**
 * Config Store
 *
 * Manages app configuration (labels, theme, business profile, services, contracts).
 * Syncs with Firestore for multi-device consistency.
 * Can be edited in Settings page for full app customization.
 */

import { create } from 'zustand'


import { doc, setDoc, getDoc, collection } from 'firebase/firestore'

import { db as firestoreDb } from '../firebase'
import { listenToAuthChanges } from '../auth'

import {
  defaultLabels,
  defaultTheme,
  defaultBusinessProfile,
  defaultServices,
  defaultContractTemplates,
  type AppLabels,
  type Theme,
  type BusinessProfile,
  type Service,
  type ContractTemplate,
} from '../config'

export type AppConfig = {
  id: string
  labels: AppLabels
  theme: Theme
  businessProfile: BusinessProfile
  services: Service[]
  contractTemplates: ContractTemplate[]
  updatedAt: number
  nextSequence: number
}

type ConfigState = {
  config: AppConfig | null
  loading: boolean
  // keep a top-level logo for any components that were already using it
  logo: string | null
    activeTenantId: string


  // Initialize config from Firestore/localStorage
  init: () => Promise<void>

  // Load config (called after auth)
  loadConfig: () => Promise<void>

  // Business Profile specific methods
  loadBusinessProfile: () => Promise<void>
  setLogo: (base64String: string) => Promise<void>
  setActiveTenantId: (tenantId: string) => void

  // Update entire config or partial sections
  update: (patch: Partial<AppConfig>) => Promise<void>

  // Update specific sections
  updateLabels: (labels: Partial<AppLabels>) => Promise<void>
  updateTheme: (theme: Partial<Theme>) => Promise<void>
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<void>
  updateServices: (services: Service[]) => Promise<void>
  updateContractTemplates: (templates: ContractTemplate[]) => Promise<void>

  // Reset to defaults
  resetToDefaults: () => Promise<void>
}

function getStableTenantId(userId: string) {
  // Use user's UID as the base for a unique tenant ID
  // This ensures each user gets their own tenant, not shared via localStorage
  return `tenant_${userId}`
}


const CONFIG_DOC_ID = 'app-config'
const LOCAL_LOGO_KEY = 'businessProfile.logo'

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: true,
  logo: null,
        activeTenantId: '',



  // ==================== INIT ====================
  init: async () => {
    console.log('🚀 CONFIG INIT CALLED')
    // Keep loading true until we determine auth state
    set({ loading: true })
    
    // Set up auth listener first (runs regardless of current auth state)
    listenToAuthChanges(async (user) => {
      // Not logged in → no tenant (prevents permission errors & drift)
      if (!user) {
        set({ activeTenantId: '', loading: false })
        return
      }

      try {
        // Tenant must be consistent across all devices for this user
        const claimRef = doc(firestoreDb, 'tenantClaims', user.uid)
        const snap = await getDoc(claimRef)

        let tenantId: string
        if (snap.exists()) {
          // Use existing tenantId from claim
          tenantId = (snap.data() as any)?.tenantId || user.uid
        } else {
          // NEW user: use their Firebase UID directly as tenantId
          // This guarantees uniqueness per user
          tenantId = user.uid
          await setDoc(claimRef, { tenantId, claimedAt: Date.now() })
        }
        
        console.log('[ConfigStore] User:', user.email, 'TenantId:', tenantId)
        set({ activeTenantId: tenantId })

        // Now load config after auth is confirmed
        await get().loadConfig()
      } catch (error) {
        console.error('Error setting tenant:', error)
        set({ loading: false })
      }
    })
  },

  // Load config from Firestore
  loadConfig: async () => {
    const { auth } = await import('../firebase')
    if (!auth.currentUser) {
      set({ loading: false })
      return
    }

    try {
      const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
      const snap = await getDoc(ref)

    let config: AppConfig

    if (snap.exists()) {
      config = snap.data() as AppConfig
    } else {
      // Create default config on first run
      config = {
        id: CONFIG_DOC_ID,
        labels: defaultLabels,
        theme: defaultTheme,
        businessProfile: defaultBusinessProfile,
        services: defaultServices,
        contractTemplates: defaultContractTemplates,
        updatedAt: Date.now(),
        nextSequence: 1,
      }
      await setDoc(ref, config)
    }

  // ── LOGO HYDRATION ─────────────────────────────
// 1) Prefer localStorage (most reliable across our tests)
const localLogo = localStorage.getItem(LOCAL_LOGO_KEY)

// If localStorage exists (even empty string), use it
if (localLogo !== null) {
  config.businessProfile = {
    ...config.businessProfile,
    logo: localLogo,
  }
}
// Otherwise, fall back to Firestore (if it has a logo)
else if (config.businessProfile.logo) {
  localStorage.setItem(LOCAL_LOGO_KEY, config.businessProfile.logo)
}



    // Apply theme to CSS variables
    applyTheme(config.theme)

    set({
      config,
      loading: false,
      logo: config.businessProfile.logo || null,
    })
    } catch (error) {
      console.error('Error loading config:', error)
      set({ loading: false })
    }
  },

    setActiveTenantId: (id: string) => {
    set({ activeTenantId: id })
  },

  // ==================== BUSINESS PROFILE ====================
  loadBusinessProfile: async () => {
    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    const snap = await getDoc(ref)

    if (!snap.exists()) return

    let config = snap.data() as AppConfig

    const localLogo = localStorage.getItem(LOCAL_LOGO_KEY)
    if (localLogo) {
      config = {
        ...config,
        businessProfile: {
          ...config.businessProfile,
          logo: localLogo,
        },
      }
    }

    set({
      config,
      logo: config.businessProfile.logo || null,
    })
  },

  setLogo: async (base64String: string) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      businessProfile: {
        ...current.businessProfile,
        logo: base64String,
      },
      updatedAt: Date.now(),
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)

    // Try to persist to Firestore, but even if it fails we still keep localStorage
    try {
      await setDoc(
        ref,
        {
          updatedAt: updated.updatedAt,
          'businessProfile.logo': base64String,
        },
        { merge: true },
      )
    } catch (error) {
      console.error('Failed to save logo to Firestore, keeping local only:', error)
    }

    // Always keep a durable copy in localStorage
    if (base64String) {
      localStorage.setItem(LOCAL_LOGO_KEY, base64String)
    } else {
      localStorage.removeItem(LOCAL_LOGO_KEY)
    }

    set({
      config: updated,
      logo: base64String || null,
    })
  },

  // ==================== UPDATE (WHOLE CONFIG) ====================
  update: async (patch) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    await setDoc(ref, updated)

    // If theme changed, re-apply it
    if (patch.theme) {
      applyTheme(updated.theme)
    }

    // If businessProfile.logo changed in this patch, keep logo/localStorage in sync
    if (patch.businessProfile && 'logo' in patch.businessProfile) {
      const newLogo = patch.businessProfile.logo || null
      if (newLogo) {
        localStorage.setItem(LOCAL_LOGO_KEY, newLogo)
      } else {
        localStorage.removeItem(LOCAL_LOGO_KEY)
      }
      set({ config: updated, logo: newLogo })
    } else {
      set({ config: updated })
    }
  },

  // ==================== UPDATE SECTIONS ====================
  updateLabels: async (labels) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      labels: { ...current.labels, ...labels },
      updatedAt: Date.now(),
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    await setDoc(ref, updated)

    set({ config: updated })
  },

  updateTheme: async (theme) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      theme: { ...current.theme, ...theme },
      updatedAt: Date.now(),
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    await setDoc(ref, updated)

    applyTheme(updated.theme)
    set({ config: updated })
  },

  updateBusinessProfile: async (profile) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      businessProfile: { ...current.businessProfile, ...profile },
      updatedAt: Date.now(),
    }

    // Keep appName synced with companyName when it changes
    if (profile.companyName) {
      updated.labels = {
        ...updated.labels,
        appName: profile.companyName,
      }
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)

    try {
      const updateData: any = {
        updatedAt: updated.updatedAt,
      }

      // Flatten all businessProfile fields, including logo
      Object.keys(profile).forEach((key) => {
        const value = profile[key as keyof BusinessProfile]
        updateData[`businessProfile.${key}`] = value

        // if we happen to be passed a new logo here, keep localStorage in sync
        if (key === 'logo') {
          if (typeof value === 'string' && value) {
            localStorage.setItem(LOCAL_LOGO_KEY, value)
          } else {
            localStorage.removeItem(LOCAL_LOGO_KEY)
          }
        }
      })

      if (profile.companyName) {
        updateData['labels.appName'] = profile.companyName
      }

      await setDoc(ref, updateData, { merge: true })

      set({
        config: updated,
        logo: updated.businessProfile.logo || null,
      })
    } catch (error) {
      console.error('Failed to update business profile:', error)
      throw error
    }
  },

  updateServices: async (services) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      services,
      updatedAt: Date.now(),
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    await setDoc(ref, updated)

    set({ config: updated })
  },

  updateContractTemplates: async (templates) => {
    const current = get().config
    if (!current) return

    const updated: AppConfig = {
      ...current,
      contractTemplates: templates,
      updatedAt: Date.now(),
    }

     const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
  await setDoc(ref, updated)

  // NEW: also persist each template in a subcollection under this config doc
  const templatesCol = collection(firestoreDb, 'config', CONFIG_DOC_ID, 'contractTemplates')
  for (const tmpl of templates) {
    if (!tmpl || !tmpl.id) continue
    const tmplRef = doc(templatesCol, tmpl.id)
    await setDoc(tmplRef, tmpl)
  }

  set({ config: updated })
},

loadContractTemplates: async () => {
  const templatesCol = collection(firestoreDb, 'config', CONFIG_DOC_ID, 'contractTemplates')
  const tmplSnap = await getDoc(doc(firestoreDb, 'config', CONFIG_DOC_ID))


  const loaded = tmplSnap.data()?.contractTemplates || []




  const current = get().config
  if (!current) return

  const updated = { ...current, contractTemplates: loaded }
  set({ config: updated })
},


  // ==================== RESET ====================
  resetToDefaults: async () => {
    const config: AppConfig = {
      id: CONFIG_DOC_ID,
      labels: defaultLabels,
      theme: defaultTheme,
      businessProfile: defaultBusinessProfile,
      services: defaultServices,
      contractTemplates: defaultContractTemplates,
      updatedAt: Date.now(),
      nextSequence: 1,
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    await setDoc(ref, config)

    applyTheme(config.theme)

    // Clear logo cache when resetting
    localStorage.removeItem(LOCAL_LOGO_KEY)

    set({
      config,
      logo: config.businessProfile.logo || null,
    })
  },
}))

// ==================== THEME APPLICATION ====================
function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-secondary', theme.secondary)
  root.style.setProperty('--color-accent1', theme.accent1)
  root.style.setProperty('--color-accent2', theme.accent2)
  root.style.setProperty('--color-background', theme.background)
}
