/**
 * Services Configuration
 * 
 * Service catalog with subservices and warnings.
 * This replaces the JSON file and provides type safety.
 */

export type Subservice = {
  id: string
  name: string
  warning?: string
  description?: string
}

export type Service = {
  id: string
  name: string
  description?: string
  subservices: Subservice[]
}

export const defaultServices: Service[] = [
  {
    id: 'tub',
    name: 'Bathtub Re-Glazing',
    description: 'Complete bathtub refinishing service',
    subservices: [
      {
        id: 'tub-prep',
        name: 'Surface Prep',
        warning: 'Ensure ventilation; may produce odors.',
        description: 'Clean and prepare surface for coating',
      },
      {
        id: 'tub-chip',
        name: 'Chip Repair',
        warning: 'Extra time may be required for curing.',
        description: 'Repair chips and cracks before refinishing',
      },
      {
        id: 'tub-standard',
        name: 'Standard Re-Glaze',
        description: 'Standard bathtub refinishing',
      },
      {
        id: 'tub-premium',
        name: 'Premium Re-Glaze',
        description: 'Premium finish with extended warranty',
      },
    ],
  },
  {
    id: 'tile',
    name: 'Tile Re-Glazing',
    description: 'Tile and surround refinishing',
    subservices: [
      {
        id: 'tile-grout',
        name: 'Grout Repair',
        warning: 'Grout must be fully dried prior to application.',
        description: 'Repair and seal grout lines',
      },
      {
        id: 'tile-standard',
        name: 'Standard Tile Refinish',
        description: 'Standard tile refinishing',
      },
      {
        id: 'tile-custom',
        name: 'Custom Color Match',
        description: 'Custom color matching for tiles',
      },
    ],
  },
  {
    id: 'sink',
    name: 'Sink Re-Glazing',
    description: 'Kitchen and bathroom sink refinishing',
    subservices: [
      {
        id: 'sink-standard',
        name: 'Standard Sink Refinish',
        description: 'Standard sink refinishing',
      },
      {
        id: 'sink-double',
        name: 'Double Sink',
        description: 'Double basin sink refinishing',
      },
    ],
  },
  {
    id: 'countertop',
    name: 'Countertop Re-Glazing',
    description: 'Countertop refinishing service',
    subservices: [
      {
        id: 'countertop-standard',
        name: 'Standard Countertop',
        description: 'Standard countertop refinishing',
      },
      {
        id: 'countertop-premium',
        name: 'Premium Stone Effect',
        description: 'Premium stone-effect finish',
      },
    ],
  },
  {
    id: 'shower',
    name: 'Shower Pan Re-Glazing',
    description: 'Shower pan and floor refinishing',
    subservices: [
      {
        id: 'shower-standard',
        name: 'Standard Shower Pan',
        description: 'Standard shower pan refinishing',
      },
      {
        id: 'shower-antislip',
        name: 'Anti-Slip Treatment',
        warning: 'Requires 48 hours to cure completely.',
        description: 'Add anti-slip texture to shower floor',
      },
    ],
  },
]
