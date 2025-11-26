// -------------------------------------------------------------
// Default Service Catalog Configuration
// Bathtub, tile, shower, sink, countertop refinishing services
// -------------------------------------------------------------

export type ServiceCategory = {
  id: string;
  name: string;
  subservices: SubService[];
};

export type SubService = {
  id: string;
  name: string;
  description?: string;
  warning?: string;
  unitPrice?: number;
};

export const defaultServices: ServiceCategory[] = [
  {
    id: 'bathtub',
    name: 'Bathtub Refinishing',
    subservices: [
      {
        id: 'tub-reglaze',
        name: 'Standard Bathtub Re-Glazing',
        description: 'Complete reglaze of standard bathtub',
        warning: 'Ensure ventilation; may produce odors.',
      },
      {
        id: 'tub-prep',
        name: 'Surface Prep',
        description: 'Surface preparation for bathtub',
        warning: 'Ensure ventilation; may produce odors.',
      },
      {
        id: 'tub-chip',
        name: 'Chip Repair',
        description: 'Repair chips and cracks in bathtub',
        warning: 'Extra time may be required for curing.',
      },
      {
        id: 'tub-rust',
        name: 'Rust Removal & Treatment',
        description: 'Remove rust spots and treat area',
        warning: 'Heavily rusted areas may require additional treatment.',
      },
    ],
  },
  {
    id: 'tile',
    name: 'Tile Refinishing',
    subservices: [
      {
        id: 'tile-reglaze',
        name: 'Tile Re-Glazing',
        description: 'Complete tile surface refinishing',
        warning: 'Grout must be fully dried prior to application.',
      },
      {
        id: 'tile-grout',
        name: 'Grout Repair',
        description: 'Grout repair and restoration',
        warning: 'Grout must be fully dried prior to application.',
      },
      {
        id: 'tile-surround',
        name: 'Tile Surround Refinishing',
        description: 'Complete tile surround refinishing',
      },
    ],
  },
  {
    id: 'shower',
    name: 'Shower Refinishing',
    subservices: [
      {
        id: 'shower-pan',
        name: 'Shower Pan Refinishing',
        description: 'Refinish shower pan/floor',
        warning: 'Allow 24 hours cure time before use.',
      },
      {
        id: 'shower-enclosure',
        name: 'Shower Enclosure Refinishing',
        description: 'Complete shower enclosure refinishing',
      },
      {
        id: 'shower-door',
        name: 'Shower Door Frame Touch-up',
        description: 'Touch-up shower door frames',
      },
    ],
  },
  {
    id: 'sink',
    name: 'Sink Refinishing',
    subservices: [
      {
        id: 'sink-bathroom',
        name: 'Bathroom Sink Refinishing',
        description: 'Complete bathroom sink reglaze',
      },
      {
        id: 'sink-kitchen',
        name: 'Kitchen Sink Refinishing',
        description: 'Complete kitchen sink reglaze',
        warning: 'Not recommended for heavy-use commercial sinks.',
      },
      {
        id: 'sink-pedestal',
        name: 'Pedestal Sink Refinishing',
        description: 'Complete pedestal sink refinishing',
      },
    ],
  },
  {
    id: 'countertop',
    name: 'Countertop Refinishing',
    subservices: [
      {
        id: 'counter-bathroom',
        name: 'Bathroom Countertop Refinishing',
        description: 'Complete bathroom countertop refinishing',
      },
      {
        id: 'counter-kitchen',
        name: 'Kitchen Countertop Refinishing',
        description: 'Complete kitchen countertop refinishing',
        warning: 'Use cutting boards; avoid placing hot items directly on surface.',
      },
      {
        id: 'counter-vanity',
        name: 'Vanity Top Refinishing',
        description: 'Vanity countertop refinishing',
      },
    ],
  },
];

export default defaultServices;
