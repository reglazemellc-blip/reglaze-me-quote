import { useEffect, useState } from 'react'
import { useSettingsStore } from '@store/useSettingsStore'
import { useConfigStore } from '@store/useConfigStore'
import type { BusinessProfile, AppLabels, Theme } from '@config/index'
import { storage } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      // Convert image to base64 first for PDF compatibility
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const base64Data = await base64Promise
      
      // Also upload to Firebase Storage for displaying in UI
      const timestamp = Date.now()
      const fileName = `logo_${timestamp}_${file.name}`
      const storageRef = ref(storage, `business/${fileName}`)
      
      // Upload with metadata to set cache control
      const metadata = {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      }
      
      await uploadBytes(storageRef, file, metadata)
      const url = await getDownloadURL(storageRef)
      
      console.log('Logo uploaded, Firebase URL:', url)
      console.log('Logo base64 length:', base64Data.length)
      
      // Store base64 instead of Firebase URL for PDF compatibility
      setProfile({ ...profile, logo: base64Data })
      alert('Logo uploaded successfully! Remember to click Save.')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload logo: ' + String(error))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateBusinessProfile(profile)
      alert('Business profile saved!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + String(err))
    }
  }

  return (
    <div className="space-y-4">
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
                accept="image/*"
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

      <button onClick={handleSave} className="btn-gold">
        Save Business Profile
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
      alert('Theme saved! Colors will update immediately.')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + String(err))
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
                value={value}
                onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                className="w-12 h-12 rounded border border-[#2a2414] cursor-pointer"
              />
              <input
                type="text"
                value={value}
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
      alert('Labels saved! Text will update across the app.')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + String(err))
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
      alert('Services saved!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + String(err))
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
      alert('Contract templates saved!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + String(err))
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#e8d487]">Contract Templates</h2>
      <p className="text-xs text-gray-500">Edit contract terms, scope, and warranty</p>

      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
        {templates.map((template: any, idx: number) => (
          <div key={idx} className="border border-[#2a2414] rounded-lg p-4 space-y-3">
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
                value={template.terms}
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
                value={template.scope}
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
                value={template.warranty}
                onChange={(e) => {
                  const updated = [...templates]
                  updated[idx].warranty = e.target.value
                  setTemplates(updated)
                }}
              />
            </div>
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
      alert('Data imported successfully!')
      window.location.reload()
    } catch (err) {
      alert('Failed to import data')
      console.error(err)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset ALL settings to defaults? This cannot be undone.')) return
    await resetToDefaults()
    alert('Settings reset to defaults!')
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
