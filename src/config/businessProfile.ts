/**
 * Business Profile Configuration
 * 
 * Core company information used throughout the app.
 * Editable in Settings page for customization by resellers.
 */

export type BusinessProfile = {
  // Company identity
  companyName: string
  tagline?: string
  logo?: string
  watermark?: string

  // Contact info
  email: string
  phone: string
  website?: string

  // Address
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string

  // Business details
  taxId?: string
  license?: string

  // Financial
  defaultTaxRate: number
  currency: string
  currencySymbol: string
}

export const defaultBusinessProfile: BusinessProfile = {
  // Identity
  companyName: 'ReGlaze Me LLC',
  tagline: 'Premium Refinishing Services',
  logo: '',
  watermark: '',

  // Contact
  email: 'reglazemellc@gmail.com',
  phone: '315-525-9142',
  website: '',

  // Address
  addressLine1: '217 3rd Ave',
  addressLine2: '',
  city: 'Frankfort',
  state: 'NY',
  zip: '13340',

  // Business
  taxId: '',
  license: '',

  // Financial
  defaultTaxRate: 0.0,
  currency: 'USD',
  currencySymbol: '$',
}
