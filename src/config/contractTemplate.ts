// -------------------------------------------------------------
// Contract Template Configuration
// Template for service contracts with e-signature support
// -------------------------------------------------------------

export const contractTemplate = {
  // Contract version for tracking template changes
  version: '1.0.0',

  // Default contract title
  title: 'Service Agreement & Contract',

  // Contract sections - placeholders use {{variable}} format
  sections: [
    {
      id: 'intro',
      title: 'Agreement',
      content: `This Service Agreement ("Agreement") is entered into between ReGlaze Me LLC ("Contractor") and {{clientName}} ("Client") on {{contractDate}}.`,
    },
    {
      id: 'scope',
      title: 'Scope of Work',
      content: `The Contractor agrees to perform the following refinishing services at {{clientAddress}}:

{{servicesList}}

Total Contract Amount: {{totalAmount}}`,
    },
    {
      id: 'payment',
      title: 'Payment Terms',
      content: `Payment is due as follows:
- A deposit of 50% ({{depositAmount}}) is due upon signing this agreement.
- The remaining balance ({{balanceAmount}}) is due upon completion of work.
- Accepted payment methods: Cash, Check, Credit Card, Venmo, Zelle.`,
    },
    {
      id: 'warranty',
      title: 'Warranty',
      content: `ReGlaze Me LLC provides a limited warranty on all refinishing work:
- Standard refinishing work is warranted for a period of 3 years from the date of completion.
- Warranty covers peeling, bubbling, and manufacturer defects.
- Warranty does NOT cover damage from impact, abrasive cleaners, or improper use.
- Client must follow all care instructions provided.`,
    },
    {
      id: 'care',
      title: 'Care Instructions',
      content: `To maintain your refinished surfaces and preserve your warranty:
- Wait 24-48 hours before using refinished surfaces.
- Use only non-abrasive cleaners (no bleach, Comet, or abrasive pads).
- Do not place suction cups or bath mats with suction cups on refinished surfaces.
- Report any issues within 30 days for warranty consideration.`,
    },
    {
      id: 'scheduling',
      title: 'Scheduling & Access',
      content: `- Work will be scheduled for {{appointmentDate}} at {{appointmentTime}}.
- Client agrees to provide reasonable access to the work area.
- Work area should be cleared and pets secured during service.
- Adequate ventilation is required; HVAC should be operational.`,
    },
    {
      id: 'cancellation',
      title: 'Cancellation Policy',
      content: `- Cancellations made more than 48 hours before scheduled service will receive a full deposit refund.
- Cancellations within 48 hours of scheduled service forfeit the deposit.
- Rescheduling is available with at least 24 hours notice.`,
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      content: `Contractor's liability is limited to the contract amount. Contractor is not responsible for:
- Pre-existing damage or defects not visible prior to work.
- Damage caused by Client's misuse or failure to follow care instructions.
- Consequential or incidental damages.`,
    },
    {
      id: 'acceptance',
      title: 'Acceptance',
      content: `By signing below, both parties agree to all terms and conditions stated in this agreement.

Client acknowledges they have read and understood this agreement and the attached quote/estimate.`,
    },
  ],

  // Signature fields
  signatures: {
    client: {
      label: 'Client Signature',
      dateLabel: 'Date',
      printNameLabel: 'Print Name',
    },
    contractor: {
      label: 'Contractor Signature',
      dateLabel: 'Date',
      printNameLabel: 'Authorized Representative',
      defaultName: 'ReGlaze Me LLC',
    },
  },

  // Footer text
  footer: `ReGlaze Me LLC | 217 3rd Ave, Frankfort, NY 13340 | 315-525-9142 | reglazemellc@gmail.com`,
} as const;

// Helper function to fill template placeholders
export function fillContractTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, String(value ?? ''));
  }
  return result;
}

export type ContractTemplate = typeof contractTemplate;
export type ContractSection = (typeof contractTemplate.sections)[number];
