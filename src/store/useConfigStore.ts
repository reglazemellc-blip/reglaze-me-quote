/**
 * Config Store
 * 
 * Manages app configuration (labels, theme, business profile, services, contracts).
 * Syncs with Firestore for multi-device consistency.
 * Can be edited in Settings page for full app customization.
 */

import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db as firestoreDb } from '../firebase'
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
}

type ConfigState = {
  config: AppConfig | null
  loading: boolean

  // Initialize config from Firestore
  init: () => Promise<void>

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

const CONFIG_DOC_ID = 'app-config'

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: true,

  // ==================== INIT ====================
  init: async () => {
    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    const snap = await getDoc(ref)

    let config: AppConfig

    if (snap.exists()) {
      config = snap.data() as AppConfig
      
      // MIGRATION: Fix app name if it's missing LLC
      let needsUpdate = false
      if (config.labels?.appName === 'ReGlaze Me') {
        config.labels.appName = 'ReGlaze Me LLC'
        needsUpdate = true
      }
      if (config.businessProfile?.companyName === 'ReGlaze Me') {
        config.businessProfile.companyName = 'ReGlaze Me LLC'
        needsUpdate = true
      }
      
      if (needsUpdate) {
        config.updatedAt = Date.now()
        await setDoc(ref, config)
      }
    } else {
      // Create default config
      config = {
        id: CONFIG_DOC_ID,
        labels: defaultLabels,
        theme: defaultTheme,
        businessProfile: defaultBusinessProfile,
        services: defaultServices,
        contractTemplates: defaultContractTemplates,
        updatedAt: Date.now(),
      }
      await setDoc(ref, config)
    }

    // Apply theme to CSS variables
    applyTheme(config.theme)

    // Load logo from localStorage if it exists (too large for Firestore)
    const savedLogo = localStorage.getItem('businessProfile.logo')
    if (savedLogo) {
      config.businessProfile.logo = savedLogo
    }

    set({ config, loading: false })
  },

  // ==================== UPDATE ====================
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

    // Apply theme if it was updated
    if (patch.theme) {
      applyTheme(updated.theme)
    }

    set({ config: updated })
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

    // Sync company name to app name in labels
    if (profile.companyName) {
      updated.labels = {
        ...updated.labels,
        appName: profile.companyName,
      }
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    
    try {
      // Update each field individually to avoid nested entity errors
      const updateData: any = {
        updatedAt: updated.updatedAt,
      }
      
      // Flatten businessProfile fields, but handle logo separately
      Object.keys(profile).forEach((key) => {
        if (key === 'logo') {
          // Store logo in localStorage instead of Firestore (too large)
          if (profile.logo) {
            localStorage.setItem('businessProfile.logo', profile.logo)
          } else {
            // Clear logo from localStorage if it's empty
            localStorage.removeItem('businessProfile.logo')
          }
        } else {
          updateData[`businessProfile.${key}`] = profile[key as keyof BusinessProfile]
        }
      })
      
      // Update labels if company name changed
      if (profile.companyName) {
        updateData['labels.appName'] = profile.companyName
      }
      
      await setDoc(ref, updateData, { merge: true })
      set({ config: updated })
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
    }

    const ref = doc(firestoreDb, 'config', CONFIG_DOC_ID)
    await setDoc(ref, config)

    applyTheme(config.theme)

    set({ config })
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
