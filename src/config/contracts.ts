/**
 * Contract Templates Configuration
 * 
 * Editable contract templates for terms, scope, warranty.
 * Must be customizable for app resale.
 */

export type ContractTemplate = {
  id: string
  name: string
  terms: string
  scope: string
  warranty: string
}

export const defaultContractTemplates: ContractTemplate[] = [
  {
    id: 'reglazing',
    name: 'ReGlazing Contract',
    terms: `CONTRACT TERM

The Contractor agrees to begin work on [START_DATE] with a projected completion date on [END_DATE].

This contract applies to the property located at: [PROPERTY_ADDRESS]

PAYMENT

The total cost of Reglazing, including materials and labor, is $[TOTAL_AMOUNT] Check [$[CHECK_AMOUNT] Cash]. Additional charges of $5 - $150 could occur if chips or cracks are found during the process. All extra cost will be brought to owner's attention before an extra charge is made. If paying by check please make checks payable to ReGlaze Me LLC.

The Client agrees to pay the Contractor $0 at contract signing and the remaining balance of $[BALANCE_AMOUNT] by check or $[CASH_AMOUNT] Cash upon project completion.

SURCHARGE

If my job is delayed because of water dripping from faucet or drains not draining properly, there will be a surcharge of $150.00. Please make sure all faucets can shut off and that all drains are draining properly.

CANCELATION

The Client will be responsible for paying all material costs if the project is canceled within 5 days of project initiation.

AGREEMENT

By signing below, both parties agree to be bound by the terms of this contract.

This Contract needs to be either E-signed, Printed, signed and handed to me, or email me back and let me know you agree to my Contract.`,

    scope: `WORK AREA PREPARATION

• Remove everything from your bathtub, and bathroom.
• Clean hallway next to bathroom.
• Need access to the closest room that has a window, with a path to the window.
• If you have a shower curtain, please take it down.
• Check to see that faucet is not leaking.
• Check to see that drain is not clogged.
• I recommend, but not necessary for the homeowner to not be in the home/apartment until job is finished.`,

    warranty: `WARRANTY

Reglaze Me LLC warranties the surface of bathtubs wall tile, and countertops refinished by us, in the owner-occupied housing for a period of 1 year providing the customer has maintained the surface as recommended. During the first-year repairs due to defects in materials or workmanship will be made free of charge. Rust, corrosion, spot repairs and all other surfaces are not warranted. This warranty is not transferable.`,
  },
  {
    id: 'commercial',
    name: 'Commercial Refinishing Contract',
    terms: `COMMERCIAL TERMS AND CONDITIONS

1. PAYMENT: Net 30 from invoice date. Purchase order required before work begins.

2. SCHEDULING: Work scheduled during off-hours or weekends to minimize business disruption.

3. MULTIPLE UNITS: Volume pricing applied for 5+ units. See quote for details.

4. ACCESS: Client provides building access, parking, and elevator usage as needed.

5. INSURANCE: Contractor carries $2M general liability and workers compensation insurance.

6. COMPLIANCE: All work meets local commercial building codes and ADA requirements where applicable.`,

    scope: `COMMERCIAL SCOPE OF WORK

Large-scale refinishing services including:

• Pre-work site assessment and planning
• Protection of common areas and adjacent units
• Surface preparation per commercial standards
• Multi-coat application system
• Quality control inspection
• Final walkthrough and sign-off
• Detailed completion documentation

Timeline:
• Multiple units completed in phases
• Minimal disruption to operations
• Coordination with building management`,

    warranty: `COMMERCIAL WARRANTY

Limited Warranty: 3 years from completion

Coverage:
• Coating failure under normal commercial use
• Workmanship defects
• Material defects

Exclusions:
• Normal wear and tear in high-traffic areas
• Damage from vandalism or abuse
• Chemical damage from improper cleaning
• Damage from building maintenance activities`,
  },
]
