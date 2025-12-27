/**
 * OnboardingWizard Component
 * 
 * 4-step guided onboarding for new users:
 * 1. Business Info (name, email, phone)
 * 2. Logo Upload (optional)
 * 3. First Client (with demo option)
 * 4. First Quote (with demo option)
 * 
 * Features:
 * - Progress bar showing current step
 * - Skip/Back buttons for navigation
 * - Mobile-responsive (full-screen on phones, modal on desktop)
 * - Saves onboarding state to prevent re-showing
 */

import { useState, useEffect } from 'react'
import { useConfigStore } from '@store/useConfigStore'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { storage } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToastStore } from '@store/useToastStore'
import { loadSampleData } from '../utils/demoData'
import type { Client, Quote } from '@db/index'

type OnboardingStep = 1 | 2 | 3 | 4

interface OnboardingWizardProps {
  onComplete: () => void
  onSkip: () => void
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Business Info
  const { config, updateBusinessProfile, setLogo, activeTenantId } = useConfigStore()
  const [businessName, setBusinessName] = useState(config?.businessProfile?.companyName || '')
  const [businessEmail, setBusinessEmail] = useState(config?.businessProfile?.email || '')
  const [businessPhone, setBusinessPhone] = useState(config?.businessProfile?.phone || '')

  // Step 2: Logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(config?.businessProfile?.logo || null)

  // Step 3: First Client
  const { upsert: upsertClient } = useClientsStore()
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)

  // Step 4: First Quote
  const { upsert: upsertQuote } = useQuotesStore()
  const [quoteTotal, setQuoteTotal] = useState('500')
  const [quoteNotes, setQuoteNotes] = useState('')

  const progressPercent = (step / 4) * 100

  const handleNext = async () => {
    setSaving(true)

    try {
      if (step === 1) {
        // Save business info
        await updateBusinessProfile({
          ...config!.businessProfile,
          companyName: businessName,
          email: businessEmail,
          phone: businessPhone,
        })
        setStep(2)
      } else if (step === 2) {
        // Upload logo if provided
        if (logoFile) {
          const storageRef = ref(storage, `logos/${Date.now()}_${logoFile.name}`)
          await uploadBytes(storageRef, logoFile)
          const url = await getDownloadURL(storageRef)
          await setLogo(url)
        }
        setStep(3)
      } else if (step === 3) {
        // Create first client
        if (!clientName.trim()) {
          useToastStore.getState().show('Please enter a client name')
          setSaving(false)
          return
        }

        const newClient: Partial<Client> = {
          id: `client_${Date.now()}`,
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          workflowStatus: 'new',
          notes: 'Created during onboarding',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        const savedClient = await upsertClient(newClient)
        setCreatedClientId(savedClient.id)
        setStep(4)
      } else if (step === 4) {
        // Create first quote
        if (!createdClientId) {
          useToastStore.getState().show('No client selected')
          setSaving(false)
          return
        }

        const total = parseFloat(quoteTotal) || 500
        const subtotal = total / 1.08 // assuming 8% tax
        const tax = total - subtotal

        const newQuote: Quote = {
          id: `quote_${Date.now()}`,
          tenantId: activeTenantId,
          clientId: createdClientId,
          clientName: clientName,
          clientPhone: clientPhone,
          clientEmail: clientEmail,
          clientAddress: '',
          quoteNumber: 'Q-2026-001',
          status: 'pending',
          workflowStatus: 'new',
          items: [
            {
              id: 'item_1',
              description: 'Bathtub Standard Re-Glaze',
              qty: 1,
              unitPrice: subtotal,
              total: subtotal,
            },
          ],
          services: ['tub'],
          subtotal,
          taxRate: 0.08,
          tax,
          discount: 0,
          total,
          notes: quoteNotes || 'Created during onboarding',
          attachments: [],
          signature: null,
          pdfUrl: null,
          sentAt: null,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        await upsertQuote(newQuote)

        // Mark onboarding as complete
        localStorage.setItem('onboarding_complete', 'true')
        useToastStore.getState().show('Welcome! Your workspace is ready.')
        onComplete()
      }
    } catch (error) {
      console.error('Onboarding step error:', error)
      useToastStore.getState().show('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as OnboardingStep)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_skipped', 'true')
    onSkip()
  }

  const handleUseDemoData = async () => {
    setSaving(true)
    try {
      const result = await loadSampleData(activeTenantId)
      if (result.success) {
        localStorage.setItem('onboarding_complete', 'true')
        useToastStore.getState().show('Demo data loaded!')
        onComplete()
        window.location.reload()
      } else {
        useToastStore.getState().show(result.message)
      }
    } catch (error) {
      useToastStore.getState().show('Failed to load demo data')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      useToastStore.getState().show('Please select a PNG or JPG file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      useToastStore.getState().show('File too large. Max 10MB.')
      return
    }

    setLogoFile(file)

    // Preview
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1a1a0f] border border-[#2a2414] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-[#2a2414]">
          <h2 className="text-2xl font-semibold text-[#e8d487]">Welcome to {config?.businessProfile?.companyName || 'Reglaze Me'}</h2>
          <p className="text-sm text-gray-400 mt-1">Let's get your workspace set up in 4 quick steps</p>

          {/* Progress Bar */}
          <div className="mt-4 bg-[#2a2414] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#e8d487] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Step {step} of 4</span>
            <span>{Math.round(progressPercent)}% complete</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* STEP 1: Business Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#e8d487] mb-2">Your Business Information</h3>
                <p className="text-sm text-gray-400">This will appear on quotes and invoices</p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Business Name *</span>
                <input
                  className="input"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Reglaze Me LLC"
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Email *</span>
                <input
                  className="input"
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Phone *</span>
                <input
                  className="input"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </label>
            </div>
          )}

          {/* STEP 2: Logo Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#e8d487] mb-2">Upload Your Logo (Optional)</h3>
                <p className="text-sm text-gray-400">Your logo will appear on quotes and invoices</p>
              </div>

              {logoPreview && (
                <div className="flex justify-center p-4 bg-white/5 rounded-lg">
                  <img src={logoPreview} alt="Logo preview" className="max-h-32 object-contain" />
                </div>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Select Logo (PNG or JPG, max 10MB)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className="text-sm text-gray-400"
                />
              </label>

              <p className="text-xs text-gray-500">
                You can skip this step and add your logo later in Settings
              </p>
            </div>
          )}

          {/* STEP 3: First Client */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#e8d487] mb-2">Create Your First Client</h3>
                <p className="text-sm text-gray-400">Or load demo data to see how the app works</p>
              </div>

              <button 
                onClick={handleUseDemoData}
                className="w-full btn-outline-gold text-sm py-2"
                disabled={saving}
              >
                Load Demo Data (5 clients, 10 quotes)
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[#2a2414]" />
                <span className="text-xs text-gray-500">OR</span>
                <div className="flex-1 h-px bg-[#2a2414]" />
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Client Name *</span>
                <input
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., John Smith"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Phone</span>
                <input
                  className="input"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Email</span>
                <input
                  className="input"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </label>
            </div>
          )}

          {/* STEP 4: First Quote */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#e8d487] mb-2">Create Your First Quote</h3>
                <p className="text-sm text-gray-400">A simple quote for {clientName}</p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Total Amount *</span>
                <input
                  className="input"
                  type="number"
                  value={quoteTotal}
                  onChange={(e) => setQuoteTotal(e.target.value)}
                  placeholder="500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-300">Notes (Optional)</span>
                <textarea
                  className="input"
                  rows={3}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Bathtub refinishing quote..."
                />
              </label>

              <div className="bg-[#2a2414] border border-[#e8d487]/20 rounded-lg p-4">
                <p className="text-xs text-gray-400">
                  You can add more details later. This is just to get you started!
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2414] flex justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="btn-outline-gold text-sm"
                disabled={saving}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-300 px-4"
              disabled={saving}
            >
              Skip for Now
            </button>
          </div>

          <button
            onClick={handleNext}
            className="btn-gold"
            disabled={saving || (step === 1 && (!businessName || !businessEmail || !businessPhone))}
          >
            {saving ? 'Saving...' : step === 4 ? 'Complete Setup' : 'Next →'}
          </button>
        </div>

      </div>
    </div>
  )
}
