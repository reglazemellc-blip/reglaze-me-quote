// -------------------------------------------------------------
// Business Profile Configuration
// Default business info for the refinishing company
// -------------------------------------------------------------

export const businessProfile = {
  // Company name
  name: 'ReGlaze Me LLC',

  // Contact information
  email: 'reglazemellc@gmail.com',
  phone: '315-525-9142',

  // Address
  address: {
    street: '217 3rd Ave',
    city: 'Frankfort',
    state: 'NY',
    zip: '13340',
  },

  // Display lines for headers/PDFs
  companyLeftLines: [
    'ReGlaze Me LLC',
    '217 3rd Ave',
    'Frankfort, NY 13340',
  ],

  companyRightLines: [
    'reglazemellc@gmail.com',
    '315-525-9142',
  ],

  // Tax settings
  defaultTaxRate: 0.0,
} as const;

export type BusinessProfile = typeof businessProfile;
