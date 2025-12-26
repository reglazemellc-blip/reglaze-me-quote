import { useEffect, useState } from 'react'
import { useSettingsStore } from '@store/useSettingsStore'
import { useConfigStore } from '@store/useConfigStore'
import type { BusinessProfile, AppLabels, Theme, ContractTemplate } from '../config'


import { storage } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToastStore } from '@store/useToastStore'

type Tab = 'business' | 'theme' | 'labels' | 'services' | 'contracts' | 'data'

export default function SettingsPage() {
  const { settings, init, update, exportJSON, importJSON, reset } = useSettingsStore()
  const { config, updateBusinessProfile, updateTheme, updateLabels, updateServices, updateContractTemplates, resetToDefaults } = useConfigStore()
  
  const [activeTab, setActiveTab] = useState<Tab>('business')
  const [taxRatePct, setTaxRatePct] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (settings)
      setTaxRatePct((settings.defaultTaxRate || 0) * 100)
  }, [settings])

  if (!settings || !config) return <div className="p-6 text-center text-gray-400">Loading settings...</div>

  const tabButton = (tab: Tab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`
        px-4 py-2 text-sm font-medium rounded-lg transition
        ${activeTab === tab
          ? 'bg-[#e8d487] text-black'
          : 'text-[#e8d487] hover:bg-[#2a2414]'
        }
      `}
    >
      {label}
    </button>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-[#e8d487]">
          {config.labels?.settingsTitle || 'Settings'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">Configure your app for resale</p>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 border-b border-[#2a2414] pb-2">
        {tabButton('business', config.labels?.settingsBusinessTab || 'Business')}
        {tabButton('theme', config.labels?.settingsThemeTab || 'Theme')}
        {tabButton('labels', config.labels?.settingsLabelsTab || 'Labels')}
        {tabButton('services', 'Services')}
        {tabButton('contracts', 'Contracts')}
        {tabButton('data', config.labels?.settingsDataTab || 'Data')}
      </div>

      {/* TAB CONTENT */}
      <div className="card p-6 bg-black/40 border border-[#2a2414]">
        {activeTab === 'business' && <BusinessTab config={config} updateBusinessProfile={updateBusinessProfile} />}
        {activeTab === 'theme' && <ThemeTab config={config} updateTheme={updateTheme} />}
        {activeTab === 'labels' && <LabelsTab config={config} updateLabels={updateLabels} />}
        {activeTab === 'services' && <ServicesTab config={config} updateServices={updateServices} />}
        {activeTab === 'contracts' && <ContractsTab config={config} updateContractTemplates={updateContractTemplates} />}
        {activeTab === 'data' && <DataTab exportJSON={exportJSON} importJSON={importJSON} resetToDefaults={resetToDefaults} />}
      </div>
    </div>
  )
}

// ==================== BUSINESS TAB ====================
function BusinessTab({ config, updateBusinessProfile }: any) {
  const [profile, setProfile] = useState({ ...config.businessProfile })
  const [uploading, setUploading] = useState(false)
  const { setLogo } = useConfigStore()

  // Sync profile state with config when config.businessProfile changes
  useEffect(() => {
    setProfile({ ...config.businessProfile })
  }, [config.businessProfile])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - PNG/JPG only
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      useToastStore.getState().show('Please select a PNG or JPG file only')
      return
    }

    // Validate file size (max 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      useToastStore.getState().show('Image size must be less than 2MB. Please compress or resize your image.')
      return
    }

    setUploading(true)
    try {
      // Convert image to base64
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // Validate the base64 result
          if (!result || result.length > 5000000) {
            reject(new Error('Image is too large after conversion'))
            return
          }
          resolve(result)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      
      const base64Data = await base64Promise
      
      console.log('Logo converted to base64, size:', base64Data.length, 'characters')
      
      // Update store immediately with setLogo
      await setLogo(base64Data)
      
      // Update preview instantly
      setProfile({ ...profile, logo: base64Data })
      
      useToastStore.getState().show('Logo uploaded and saved successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      useToastStore.getState().show('Failed to upload logo: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateBusinessProfile(profile)
      useToastStore.getState().show('Business profile saved!')
    } catch (err) {
      console.error('Save error:', err)
      useToastStore.getState().show('Failed to save: ' + String(err))
    }
  }

  return (
    <div className="space-y-4">
      {/* TENANT SELECTOR */}
<div className="flex flex-col gap-1">
  <span className="text-xs text-gray-400">Active Tenant</span>
  <select
    className="input"
    value={useConfigStore.getState().activeTenantId}
    onChange={(e) => useConfigStore.getState().setActiveTenantId(e.target.value)}
  >
    <option value="default">Default Tenant</option>
    <option value="demo">Demo Tenant</option>
    <option value="clientA">Client A</option>
  </select>
</div>

      <h2 className="text-lg font-semibold text-[#e8d487]">Business Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Company Name</span>
          <input
            className="input"
            value={profile.companyName}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Tagline</span>
          <input
            className="input"
            value={profile.tagline || ''}
            onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
          />
        </label>
      </div>

      {/* LOGO UPLOAD SECTION */}
      <div className="border border-[#2a2414] rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#e8d487]">Company Logo</h3>
        
        {/* Current Logo Preview */}
        {profile.logo && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Current Logo:</p>
            <div className="flex items-center gap-3">
              <img 
                src={profile.logo} 
                alt="Company Logo" 
                className="h-20 w-20 object-contain bg-white rounded border border-[#2a2414]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <button
                onClick={() => setProfile({ ...profile, logo: '' })}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove Logo
              </button>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs text-gray-400">
              {profile.logo ? 'Replace Logo' : 'Upload Logo'}
            </span>
            <div className="mt-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#e8d487] file:text-black
                  hover:file:bg-[#d4c070]
                  file:cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </label>
          {uploading && (
            <p className="text-xs text-[#e8d487]">Uploading logo...</p>
          )}
          <p className="text-xs text-gray-500">
            Recommended: PNG or JPG, max 5MB. Square images work best (e.g., 500x500px)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Email</span>
          <input
            className="input"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Phone</span>
          <input
            className="input"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Website</span>
          <input
            className="input"
            value={profile.website || ''}
            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Address Line 1</span>
          <input
            className="input"
            value={profile.addressLine1}
            onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Address Line 2</span>
          <input
            className="input"
            value={profile.addressLine2 || ''}
            onChange={(e) => setProfile({ ...profile, addressLine2: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">City</span>
          <input
            className="input"
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">State</span>
          <input
            className="input"
            value={profile.state}
            onChange={(e) => setProfile({ ...profile, state: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">ZIP Code</span>
          <input
            className="input"
            value={profile.zip}
            onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Tax ID</span>
          <input
            className="input"
            value={profile.taxId || ''}
            onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">License</span>
          <input
            className="input"
            value={profile.license || ''}
            onChange={(e) => setProfile({ ...profile, license: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Default Tax Rate (%)</span>
          <input
            className="input"
            type="number"
            step="0.01"
            value={profile.defaultTaxRate * 100}
            onChange={(e) => setProfile({ ...profile, defaultTaxRate: Number(e.target.value) / 100 })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Currency</span>
          <input
            className="input"
            value={profile.currency}
            onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
          />
        </label>
      </div>

      {/* CALL SCRIPT & INTAKE CHECKLIST */}
      <CallScriptSection />

      <button onClick={handleSave} className="btn-gold">
        Save Business Profile
      </button>
    </div>
  )
}

// ==================== CALL SCRIPT & CHECKLIST SECTION ====================
function CallScriptSection() {
  const { settings, update } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<'homeowner' | 'propertyManager'>('homeowner')
  const [saving, setSaving] = useState(false)
  
  // Homeowner state
  const [homeownerScripts, setHomeownerScripts] = useState(settings?.homeownerScripts || {
    outbound: '',
    inbound: '',
    voicemail: '',
    followUpText: '',
  })
  const [homeownerQuestions, setHomeownerQuestions] = useState<string[]>(settings?.defaultChecklistQuestions || [])
  
  // Property Manager state
  const [pmScripts, setPmScripts] = useState(settings?.propertyManagerScripts || {
    outbound: '',
    inbound: '',
    voicemail: '',
    followUpText: '',
  })
  const [pmQuestions, setPmQuestions] = useState<string[]>(settings?.propertyManagerChecklistQuestions || [])
  
  // Shared
  const [answerOptions, setAnswerOptions] = useState<Record<string, string[]>>(settings?.defaultChecklistAnswerOptions || {})
  const [newQuestion, setNewQuestion] = useState('')
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [newOptionText, setNewOptionText] = useState('')

  useEffect(() => {
    if (settings) {
      setHomeownerScripts(settings.homeownerScripts || {
        outbound: settings.callScript || '',
        inbound: '',
        voicemail: '',
        followUpText: '',
      })
      setHomeownerQuestions(settings.defaultChecklistQuestions || [])
      setPmScripts(settings.propertyManagerScripts || {
        outbound: '',
        inbound: '',
        voicemail: '',
        followUpText: '',
      })
      setPmQuestions(settings.propertyManagerChecklistQuestions || [])
      setAnswerOptions(settings.defaultChecklistAnswerOptions || {})
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await update({
        homeownerScripts,
        propertyManagerScripts: pmScripts,
        defaultChecklistQuestions: homeownerQuestions.filter(q => q.trim()),
        propertyManagerChecklistQuestions: pmQuestions.filter(q => q.trim()),
        defaultChecklistAnswerOptions: answerOptions,
      })
      useToastStore.getState().show('Scripts & checklists saved!')
    } catch (err) {
      useToastStore.getState().show('Failed to save: ' + String(err))
    } finally {
      setSaving(false)
    }
  }

  // Current questions based on tab
  const questions = activeTab === 'homeowner' ? homeownerQuestions : pmQuestions
  const setQuestions = activeTab === 'homeowner' ? setHomeownerQuestions : setPmQuestions
  const scripts = activeTab === 'homeowner' ? homeownerScripts : pmScripts
  const setScripts = activeTab === 'homeowner' ? setHomeownerScripts : setPmScripts

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()])
      setNewQuestion('')
    }
  }

  const removeQuestion = (idx: number) => {
    const questionToRemove = questions[idx]
    setQuestions(questions.filter((_, i) => i !== idx))
    const newOptions = { ...answerOptions }
    delete newOptions[questionToRemove]
    setAnswerOptions(newOptions)
  }

  const updateQuestion = (idx: number, oldQuestion: string, newValue: string) => {
    const updated = [...questions]
    updated[idx] = newValue
    setQuestions(updated)
    if (oldQuestion !== newValue && answerOptions[oldQuestion]) {
      const newOptions = { ...answerOptions }
      newOptions[newValue] = newOptions[oldQuestion]
      delete newOptions[oldQuestion]
      setAnswerOptions(newOptions)
    }
  }

  const addAnswerOption = (question: string) => {
    if (newOptionText.trim()) {
      const currentOptions = answerOptions[question] || []
      setAnswerOptions({
        ...answerOptions,
        [question]: [...currentOptions, newOptionText.trim()]
      })
      setNewOptionText('')
    }
  }

  const removeAnswerOption = (question: string, optionIdx: number) => {
    const currentOptions = answerOptions[question] || []
    setAnswerOptions({
      ...answerOptions,
      [question]: currentOptions.filter((_, i) => i !== optionIdx)
    })
  }

  const updateAnswerOption = (question: string, optionIdx: number, value: string) => {
    const currentOptions = [...(answerOptions[question] || [])]
    currentOptions[optionIdx] = value
    setAnswerOptions({
      ...answerOptions,
      [question]: currentOptions
    })
  }

  return (
    <div className="border border-[#2a2414] rounded-lg p-4 space-y-4 mt-6">
      <h3 className="text-lg font-semibold text-[#e8d487]">📞 Call Scripts & Intake Questions</h3>
      
      {/* Tab buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('homeowner')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'homeowner'
              ? 'bg-[#e8d487] text-black'
              : 'bg-black/30 text-gray-400 hover:text-[#e8d487]'
          }`}
        >
          🏠 Homeowner
        </button>
        <button
          onClick={() => setActiveTab('propertyManager')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'propertyManager'
              ? 'bg-[#e8d487] text-black'
              : 'bg-black/30 text-gray-400 hover:text-[#e8d487]'
          }`}
        >
          🏢 Property Manager
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {activeTab === 'homeowner' 
          ? 'Scripts for residential homeowner calls'
          : 'Scripts for property managers & apartments (business-to-business)'}
      </p>

      {/* Script sections */}
      <div className="grid gap-4">
        {/* Outbound Script */}
        <div className="bg-black/20 rounded-lg p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-green-400 font-medium">📤 Outbound (You Call Them)</span>
            <textarea
              className="input min-h-[100px] resize-y text-sm"
              placeholder="Hi, this is Joe from ReGlaze Me LLC..."
              value={scripts.outbound}
              onChange={(e) => setScripts({ ...scripts, outbound: e.target.value })}
            />
          </label>
        </div>

        {/* Inbound Script */}
        <div className="bg-black/20 rounded-lg p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-blue-400 font-medium">📥 Inbound (They Call You)</span>
            <textarea
              className="input min-h-[80px] resize-y text-sm"
              placeholder="ReGlaze Me LLC, this is Joe..."
              value={scripts.inbound}
              onChange={(e) => setScripts({ ...scripts, inbound: e.target.value })}
            />
          </label>
        </div>

        {/* Voicemail Script */}
        <div className="bg-black/20 rounded-lg p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-yellow-400 font-medium">📱 Voicemail</span>
            <textarea
              className="input min-h-[80px] resize-y text-sm"
              placeholder="Hi, this is Joe with ReGlaze Me LLC returning your call..."
              value={scripts.voicemail}
              onChange={(e) => setScripts({ ...scripts, voicemail: e.target.value })}
            />
          </label>
        </div>

        {/* Follow-up Text */}
        <div className="bg-black/20 rounded-lg p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-purple-400 font-medium">💬 Follow-up Text</span>
            <textarea
              className="input min-h-[60px] resize-y text-sm"
              placeholder="Hi, this is Joe with ReGlaze Me LLC. I just tried calling..."
              value={scripts.followUpText}
              onChange={(e) => setScripts({ ...scripts, followUpText: e.target.value })}
            />
            <span className="text-xs text-gray-500">Copy this to send via text after missed calls</span>
          </label>
        </div>
      </div>

      {/* Intake Questions */}
      <div className="border-t border-[#2a2414] pt-4 space-y-3">
        <div>
          <span className="text-sm text-[#e8d487] font-medium">
            {activeTab === 'homeowner' ? '🏠 Homeowner' : '🏢 Property Manager'} Intake Questions
          </span>
          <p className="text-xs text-gray-500">Click a question to add/edit dropdown options</p>
        </div>
        
        {questions.map((q, idx) => (
          <div key={idx} className="border border-[#2a2414] rounded-lg overflow-hidden">
            <div className="flex gap-2 items-center p-2 bg-black/20">
              <span className="text-xs text-gray-500 w-5">{idx + 1}.</span>
              <input
                className="input flex-1 text-sm"
                value={q}
                onChange={(e) => updateQuestion(idx, q, e.target.value)}
              />
              <button
                type="button"
                onClick={() => setExpandedQuestion(expandedQuestion === q ? null : q)}
                className={`px-2 py-1 text-xs rounded transition ${
                  expandedQuestion === q 
                    ? 'bg-[#e8d487] text-black' 
                    : 'text-[#e8d487] hover:bg-black/40'
                }`}
              >
                {answerOptions[q]?.length || 0} ▼
              </button>
              <button
                type="button"
                onClick={() => removeQuestion(idx)}
                className="p-1 text-red-400 hover:text-red-300 text-sm"
              >
                ✕
              </button>
            </div>
            
            {expandedQuestion === q && (
              <div className="p-3 bg-black/30 border-t border-[#2a2414] space-y-2">
                <p className="text-xs text-gray-400">Dropdown options:</p>
                
                {(answerOptions[q] || []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-2 items-center pl-4">
                    <span className="text-xs text-gray-600">•</span>
                    <input
                      className="input flex-1 text-sm py-1"
                      value={opt}
                      onChange={(e) => updateAnswerOption(q, optIdx, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeAnswerOption(q, optIdx)}
                      className="p-1 text-red-400 hover:text-red-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                <div className="flex gap-2 items-center pl-4 mt-2">
                  <span className="text-xs text-gray-600">+</span>
                  <input
                    className="input flex-1 text-sm py-1"
                    placeholder="Add option..."
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addAnswerOption(q)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addAnswerOption(q)}
                    disabled={!newOptionText.trim()}
                    className="px-2 py-1 bg-[#e8d487] text-black rounded text-xs font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                
                {!(answerOptions[q] || []).includes('Other') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerOptions({
                        ...answerOptions,
                        [q]: [...(answerOptions[q] || []), 'Other']
                      })
                    }}
                    className="ml-4 text-xs text-[#e8d487] hover:text-[#ffd700]"
                  >
                    + Add "Other" option
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 w-5">+</span>
          <input
            className="input flex-1 text-sm"
            placeholder="Add a new question..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
          />
          <button
            type="button"
            onClick={addQuestion}
            disabled={!newQuestion.trim()}
            className="px-3 py-2 bg-[#e8d487] text-black rounded font-medium text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <button 
        onClick={handleSave} 
        disabled={saving}
        className="btn-gold w-full"
      >
        {saving ? 'Saving...' : 'Save All Scripts & Questions'}
      </button>
    </div>
  )
}

// ==================== THEME TAB ====================
function ThemeTab({ config, updateTheme }: any) {
  const [theme, setTheme] = useState({ ...config.theme })

  const handleSave = async () => {
    try {
      await updateTheme(theme)
      useToastStore.getState().show('Theme saved! Colors will update immediately.')
    } catch (err) {
      console.error('Save error:', err)
      useToastStore.getState().show('Failed to save: ' + String(err))
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#e8d487]">Theme Colors</h2>
      <p className="text-xs text-gray-500">Colors update across the entire app</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(theme).map(([key, value]) => (
          <label key={key} className="flex flex-col gap-2">
            <span className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={(value as string) ?? ''}

                onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                className="w-12 h-12 rounded border border-[#2a2414] cursor-pointer"
              />
              <input
                type="text"
                value={(value as string) ?? ''}
                onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                className="input flex-1"
              />
            </div>
          </label>
        ))}
      </div>

      <button onClick={handleSave} className="btn-gold">
        Save Theme
      </button>
    </div>
  )
}

// ==================== LABELS TAB ====================
function LabelsTab({ config, updateLabels }: any) {
  const [labels, setLabels] = useState({ ...config.labels })
  const [search, setSearch] = useState('')

  const handleSave = async () => {
    try {
      await updateLabels(labels)
      useToastStore.getState().show('Labels saved! Text will update across the app.')
    } catch (err) {
      console.error('Save error:', err)
      useToastStore.getState().show('Failed to save: ' + String(err))
    }
  }

  const filtered = Object.entries(labels).filter(([key]) =>
    key.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#e8d487]">UI Labels</h2>
      <p className="text-xs text-gray-500">Customize all text throughout the app</p>

      <input
        className="input"
        placeholder="Search labels..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
        {filtered.map(([key, value]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-mono">{key}</span>
            <input
              className="input"
              value={value as string}
              onChange={(e) => setLabels({ ...labels, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <button onClick={handleSave} className="btn-gold sticky bottom-0">
        Save Labels
      </button>
    </div>
  )
}

// ==================== SERVICES TAB ====================
function ServicesTab({ config, updateServices }: any) {
  const [services, setServices] = useState([...config.services])

  const handleSave = async () => {
    try {
      await updateServices(services)
      useToastStore.getState().show('Services saved!')
    } catch (err) {
      console.error('Save error:', err)
      useToastStore.getState().show('Failed to save: ' + String(err))
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#e8d487]">Service Catalog</h2>
      <p className="text-xs text-gray-500">Edit services and subservices</p>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {services.map((service: any, sIdx: number) => (
          <div key={sIdx} className="border border-[#2a2414] rounded-lg p-4 space-y-3">
            <input
              className="input font-semibold"
              placeholder="Service name"
              value={service.name}
              onChange={(e) => {
                const updated = [...services]
                updated[sIdx].name = e.target.value
                setServices(updated)
              }}
            />

            <textarea
              className="input h-20"
              placeholder="Service description"
              value={service.description || ''}
              onChange={(e) => {
                const updated = [...services]
                updated[sIdx].description = e.target.value
                setServices(updated)
              }}
            />

            <div className="text-xs text-gray-400 font-semibold">Subservices:</div>
            {service.subservices.map((sub: any, subIdx: number) => (
              <div key={subIdx} className="pl-4 border-l-2 border-[#2a2414] space-y-2">
                <input
                  className="input text-sm"
                  placeholder="Subservice name"
                  value={sub.name}
                  onChange={(e) => {
                    const updated = [...services]
                    updated[sIdx].subservices[subIdx].name = e.target.value
                    setServices(updated)
                  }}
                />
                <textarea
                  className="input text-sm h-16"
                  placeholder="Warning (optional)"
                  value={sub.warning || ''}
                  onChange={(e) => {
                    const updated = [...services]
                    updated[sIdx].subservices[subIdx].warning = e.target.value
                    setServices(updated)
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={handleSave} className="btn-gold">
        Save Services
      </button>
    </div>
  )
}

// ==================== CONTRACTS TAB ====================
function ContractsTab({ config, updateContractTemplates }: any) {
  const [templates, setTemplates] = useState([...config.contractTemplates])

  const handleSave = async () => {
    try {
      await updateContractTemplates(templates)
      useToastStore.getState().show('Contract templates saved!')
    } catch (err) {
      console.error('Save error:', err)
      useToastStore.getState().show('Failed to save: ' + String(err))
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#e8d487]">Contract Templates</h2>
      <p className="text-xs text-gray-500">Edit contract terms, scope, and warranty</p>
<button onClick={() => setTemplates([...templates, { id: Date.now(), name: `Template ${templates.length + 1}`, terms: '', scope: '', warranty: '' }])} className="btn-gold mb-2">Add New Template</button>
      <div className="space-y-6">

        
           {templates.map((template: ContractTemplate, idx: number) => (
  <div key={template.id} className="border border-[#2a2414] rounded-lg p-4 space-y-3">

            <input
              className="input font-semibold"
              placeholder="Template name"
              value={template.name}
              onChange={(e) => {
                const updated = [...templates]
                updated[idx].name = e.target.value
                setTemplates(updated)
              }}
            />

            <div>
              <div className="text-xs text-gray-400 mb-1">Terms & Conditions</div>
              <textarea
                className="input h-32 font-mono text-xs"
                value={template.terms ?? ''}
                onChange={(e) => {
                  const updated = [...templates]
                  updated[idx].terms = e.target.value
                  setTemplates(updated)
                }}
              />
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Scope of Work</div>
              <textarea
                className="input h-32 font-mono text-xs"
                value={template.scope ?? ''}

                onChange={(e) => {
                  const updated = [...templates]
                  updated[idx].scope = e.target.value
                  setTemplates(updated)
                }}
              />
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Warranty</div>
              <textarea
                className="input h-32 font-mono text-xs"
                value={template.warranty ?? ''}
                onChange={(e) => {
                  const updated = [...templates]
                  
                  updated[idx].warranty = e.target.value
                  setTemplates(updated)
                }}
              />
            </div>
            <button onClick={() => setTemplates(templates.filter((_, i) => i !== idx))} className="btn-red text-xs">Delete Template</button>

          </div>
        ))}
      </div>

      <button onClick={handleSave} className="btn-gold">
        Save Contract Templates
      </button>
    </div>
  )
}

// ==================== DATA TAB ====================
function DataTab({ exportJSON, importJSON, resetToDefaults }: any) {
  const handleExport = async () => {
    const blob = await exportJSON()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reglaze-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importJSON(data)
      useToastStore.getState().show('Data imported successfully!')
      window.location.reload()
    } catch (err) {
      useToastStore.getState().show('Failed to import data')
      console.error(err)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset ALL settings to defaults? This cannot be undone.')) return
    await resetToDefaults()
    useToastStore.getState().show('Settings reset to defaults!')
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#e8d487]">Export Data</h2>
        <p className="text-xs text-gray-500 mb-3">Download all settings and data as JSON</p>
        <button onClick={handleExport} className="btn-outline-gold">
          Export Backup
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#e8d487]">Import Data</h2>
        <p className="text-xs text-gray-500 mb-3">Restore from a previous backup</p>
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          className="text-xs text-gray-400"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#e8d487]">Factory Reset</h2>
        <p className="text-xs text-gray-500 mb-3">Reset all settings to defaults (danger zone)</p>
        <button onClick={handleReset} className="btn-outline-gold text-red-500 border-red-500 hover:bg-red-500/10">
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
