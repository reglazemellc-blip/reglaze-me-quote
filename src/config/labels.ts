/**
 * UI Labels Configuration
 * 
 * All user-facing text, headings, field labels, and messages.
 * Must be editable for app resale customization.
 */

export type AppLabels = {
  // App-wide
  appName: string
  appTagline: string

  // Navigation
  navDashboard: string
  navClients: string
  navQuotes: string
  navInvoices: string
  navContracts: string
  navReminders: string
  navCatalog: string
  navSettings: string

  // Dashboard
  dashboardTitle: string
  dashboardSubtitle: string
  dashboardQuotesLabel: string
  dashboardClientsLabel: string
  dashboardRevenueLabel: string

  // Clients
  clientsTitle: string
  clientsSearchPlaceholder: string
  clientNewButton: string
  clientNameLabel: string
  clientPhoneLabel: string
  clientEmailLabel: string
  clientAddressLabel: string
  clientCityLabel: string
  clientStateLabel: string
  clientZipLabel: string
  clientNotesLabel: string
  clientSaveButton: string
  clientCancelButton: string
  clientDeleteConfirm: string

  // Quotes
  quotesTitle: string
  quoteNewButton: string
  quoteIdLabel: string
  quoteClientLabel: string
  quoteStatusLabel: string
  quoteTotalLabel: string
  quoteServicesLabel: string
  quoteItemsLabel: string
  quoteSubtotalLabel: string
  quoteTaxLabel: string
  quoteDiscountLabel: string
  quoteNotesLabel: string
  quoteSaveButton: string
  quoteGeneratePDFButton: string
  quoteConvertToInvoiceButton: string
  quoteDeleteConfirm: string

  // Quote line items
  lineItemDescriptionLabel: string
  lineItemQuantityLabel: string
  lineItemRateLabel: string
  lineItemTotalLabel: string
  lineItemAddButton: string
  lineItemRemoveButton: string

  // Invoices
  invoicesTitle: string
  invoiceNewButton: string
  invoiceIdLabel: string
  invoiceStatusLabel: string
  invoiceTotalLabel: string
  invoicePaidLabel: string
  invoiceBalanceLabel: string
  invoiceDueDateLabel: string
  invoicePaymentLabel: string
  invoiceMarkPaidButton: string
  invoiceDeleteConfirm: string
  invoiceClientInfo: string
  invoiceRecordPayment: string
  invoiceRecordPaymentButton: string
  invoiceQuoteDetails: string

  // Contracts
  contractsTitle: string
  contractNewButton: string
  contractIdLabel: string
  contractTemplateLabel: string
  contractTermsLabel: string
  contractScopeLabel: string
  contractWarrantyLabel: string
  contractClientSignatureLabel: string
  contractContractorSignatureLabel: string
  contractStatusLabel: string
  contractGeneratePDFButton: string
  contractDeleteConfirm: string

  // Reminders
  remindersTitle: string
  reminderNewButton: string
  reminderClientLabel: string
  reminderQuoteLabel: string
  reminderDateLabel: string
  reminderNoteLabel: string
  reminderSnoozeButton: string
  reminderMarkDoneButton: string
  reminderDeleteButton: string
  reminderActiveFilter: string
  reminderDoneFilter: string

  // Catalog/Services
  catalogTitle: string
  serviceAddButton: string
  serviceNameLabel: string
  serviceDescriptionLabel: string
  serviceWarningLabel: string
  serviceSaveButton: string
  serviceDeleteConfirm: string

  // Settings
  settingsTitle: string
  settingsBusinessTab: string
  settingsThemeTab: string
  settingsLabelsTab: string
  settingsDataTab: string
  settingsCompanyNameLabel: string
  settingsEmailLabel: string
  settingsPhoneLabel: string
  settingsAddressLabel: string
  settingsTaxRateLabel: string
  settingsLogoLabel: string
  settingsWatermarkLabel: string
  settingsPrimaryColorLabel: string
  settingsSecondaryColorLabel: string
  settingsAccent1ColorLabel: string
  settingsAccent2ColorLabel: string
  settingsBackgroundColorLabel: string
  settingsExportButton: string
  settingsImportButton: string
  settingsResetButton: string
  settingsResetConfirm: string

  // Status badges
  statusPending: string
  statusApproved: string
  statusScheduled: string
  statusInProgress: string
  statusCompleted: string
  statusCanceled: string
  statusUnpaid: string
  statusPartial: string
  statusPaid: string
  statusRefunded: string
  statusDraft: string
  statusSent: string
  statusSigned: string

  // Common actions
  actionSave: string
  actionCancel: string
  actionDelete: string
  actionEdit: string
  actionView: string
  actionAdd: string
  actionRemove: string
  actionSearch: string
  actionFilter: string
  actionSort: string
  actionExport: string
  actionImport: string
  actionPrint: string
  actionDownload: string
  actionUpload: string
  actionBack: string
  actionNext: string
  actionPrevious: string
  actionClose: string

  // Messages
  msgSaveSuccess: string
  msgSaveError: string
  msgDeleteSuccess: string
  msgDeleteError: string
  msgLoadError: string
  msgNoResults: string
  msgRequired: string
  msgInvalidEmail: string
  msgInvalidPhone: string
}

export const defaultLabels: AppLabels = {
  // App-wide
  appName: 'ReGlaze Me LLC',
  appTagline: 'Premium Refinishing Management',

  // Navigation
  navDashboard: 'Dashboard',
  navClients: 'Clients',
  navQuotes: 'Quotes',
  navInvoices: 'Invoices',
  navContracts: 'Contracts',
  navReminders: 'Reminders',
  navCatalog: 'Catalog',
  navSettings: 'Settings',

  // Dashboard
  dashboardTitle: 'Dashboard',
  dashboardSubtitle: 'Business overview',
  dashboardQuotesLabel: 'Active Quotes',
  dashboardClientsLabel: 'Total Clients',
  dashboardRevenueLabel: 'Revenue',

  // Clients
  clientsTitle: 'Clients',
  clientsSearchPlaceholder: 'Search clients...',
  clientNewButton: 'New Client',
  clientNameLabel: 'Name',
  clientPhoneLabel: 'Phone',
  clientEmailLabel: 'Email',
  clientAddressLabel: 'Street Address',
  clientCityLabel: 'City',
  clientStateLabel: 'State',
  clientZipLabel: 'ZIP Code',
  clientNotesLabel: 'Notes',
  clientSaveButton: 'Save Client',
  clientCancelButton: 'Cancel',
  clientDeleteConfirm: 'Delete this client and all their quotes?',

  // Quotes
  quotesTitle: 'Quotes',
  quoteNewButton: 'New Quote',
  quoteIdLabel: 'Quote ID',
  quoteClientLabel: 'Client',
  quoteStatusLabel: 'Status',
  quoteTotalLabel: 'Total',
  quoteServicesLabel: 'Services',
  quoteItemsLabel: 'Line Items',
  quoteSubtotalLabel: 'Subtotal',
  quoteTaxLabel: 'Tax',
  quoteDiscountLabel: 'Discount',
  quoteNotesLabel: 'Notes',
  quoteSaveButton: 'Save Quote',
  quoteGeneratePDFButton: 'Generate PDF',
  quoteConvertToInvoiceButton: 'Convert to Invoice',
  quoteDeleteConfirm: 'Delete this quote?',

  // Quote line items
  lineItemDescriptionLabel: 'Description',
  lineItemQuantityLabel: 'Qty',
  lineItemRateLabel: 'Rate',
  lineItemTotalLabel: 'Total',
  lineItemAddButton: 'Add Line Item',
  lineItemRemoveButton: 'Remove',

  // Invoices
  invoicesTitle: 'Invoices',
  invoiceNewButton: 'New Invoice',
  invoiceIdLabel: 'Invoice ID',
  invoiceStatusLabel: 'Status',
  invoiceTotalLabel: 'Total',
  invoicePaidLabel: 'Paid',
  invoiceBalanceLabel: 'Balance',
  invoiceDueDateLabel: 'Due Date',
  invoicePaymentLabel: 'Payment Amount',
  invoiceMarkPaidButton: 'Mark as Paid',
  invoiceDeleteConfirm: 'Delete this invoice?',
  invoiceClientInfo: 'Client Information',
  invoiceRecordPayment: 'Record Payment',
  invoiceRecordPaymentButton: 'Record Payment',
  invoiceQuoteDetails: 'Quote Details',

  // Contracts
  contractsTitle: 'Contracts',
  contractNewButton: 'New Contract',
  contractIdLabel: 'Contract ID',
  contractTemplateLabel: 'Template',
  contractTermsLabel: 'Terms & Conditions',
  contractScopeLabel: 'Scope of Work',
  contractWarrantyLabel: 'Warranty',
  contractClientSignatureLabel: 'Client Signature',
  contractContractorSignatureLabel: 'Contractor Signature',
  contractStatusLabel: 'Status',
  contractGeneratePDFButton: 'Generate PDF',
  contractDeleteConfirm: 'Delete this contract?',

  // Reminders
  remindersTitle: 'Reminders',
  reminderNewButton: 'New Reminder',
  reminderClientLabel: 'Client',
  reminderQuoteLabel: 'Quote',
  reminderDateLabel: 'Remind On',
  reminderNoteLabel: 'Note',
  reminderSnoozeButton: 'Snooze',
  reminderMarkDoneButton: 'Mark Done',
  reminderDeleteButton: 'Delete',
  reminderActiveFilter: 'Active',
  reminderDoneFilter: 'Done',

  // Catalog/Services
  catalogTitle: 'Service Catalog',
  serviceAddButton: 'Add Service',
  serviceNameLabel: 'Service Name',
  serviceDescriptionLabel: 'Description',
  serviceWarningLabel: 'Warning',
  serviceSaveButton: 'Save Service',
  serviceDeleteConfirm: 'Delete this service?',

  // Settings
  settingsTitle: 'Settings',
  settingsBusinessTab: 'Business',
  settingsThemeTab: 'Theme',
  settingsLabelsTab: 'Labels',
  settingsDataTab: 'Data',
  settingsCompanyNameLabel: 'Company Name',
  settingsEmailLabel: 'Email',
  settingsPhoneLabel: 'Phone',
  settingsAddressLabel: 'Address',
  settingsTaxRateLabel: 'Default Tax Rate (%)',
  settingsLogoLabel: 'Logo',
  settingsWatermarkLabel: 'Watermark',
  settingsPrimaryColorLabel: 'Primary Color',
  settingsSecondaryColorLabel: 'Secondary Color',
  settingsAccent1ColorLabel: 'Accent 1 Color',
  settingsAccent2ColorLabel: 'Accent 2 Color',
  settingsBackgroundColorLabel: 'Background Color',
  settingsExportButton: 'Export Data',
  settingsImportButton: 'Import Data',
  settingsResetButton: 'Factory Reset',
  settingsResetConfirm: 'Reset all settings to defaults?',

  // Status badges
  statusPending: 'Pending',
  statusApproved: 'Approved',
  statusScheduled: 'Scheduled',
  statusInProgress: 'In Progress',
  statusCompleted: 'Completed',
  statusCanceled: 'Canceled',
  statusUnpaid: 'Unpaid',
  statusPartial: 'Partial',
  statusPaid: 'Paid',
  statusRefunded: 'Refunded',
  statusDraft: 'Draft',
  statusSent: 'Sent',
  statusSigned: 'Signed',

  // Common actions
  actionSave: 'Save',
  actionCancel: 'Cancel',
  actionDelete: 'Delete',
  actionEdit: 'Edit',
  actionView: 'View',
  actionAdd: 'Add',
  actionRemove: 'Remove',
  actionSearch: 'Search',
  actionFilter: 'Filter',
  actionSort: 'Sort',
  actionExport: 'Export',
  actionImport: 'Import',
  actionPrint: 'Print',
  actionDownload: 'Download',
  actionUpload: 'Upload',
  actionBack: 'Back',
  actionNext: 'Next',
  actionPrevious: 'Previous',
  actionClose: 'Close',

  // Messages
  msgSaveSuccess: 'Saved successfully',
  msgSaveError: 'Error saving',
  msgDeleteSuccess: 'Deleted successfully',
  msgDeleteError: 'Error deleting',
  msgLoadError: 'Error loading data',
  msgNoResults: 'No results found',
  msgRequired: 'This field is required',
  msgInvalidEmail: 'Invalid email address',
  msgInvalidPhone: 'Invalid phone number',
}
