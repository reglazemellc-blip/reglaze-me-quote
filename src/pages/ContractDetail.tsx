/**
 * Contract Detail/Editor Page
 * Create and manage contracts with digital signatures
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, FileText, Trash2 } from 'lucide-react'
import SignaturePad from 'signature_pad'
import { useContractsStore } from '@store/useContractsStore'
import { useClientsStore } from '@store/useClientsStore'
import { useQuotesStore } from '@store/useQuotesStore'
import { useConfigStore } from '@store/useConfigStore'
import { generateContractPDF } from '@utils/pdf'
import type { Contract, ContractStatus } from '@db/index'
import { useToastStore } from '@store/useToastStore'

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
const location = useLocation();
const isNew = id === 'new';
const editId = isNew ? null : id;


  const { contracts, upsert, remove, addSignature, removeSignature, init: initContracts } = useContractsStore()
  const { clients, init: initClients } = useClientsStore()
  const { quotes, init: initQuotes } = useQuotesStore()
  const { config, init: initConfig } = useConfigStore()


  const [loading, setLoading] = useState(false)
    const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'>('idle')
  const [contract, setContract] = useState<Contract | null>(null)

  // Initialize stores
  useEffect(() => {
  initContracts()
  initClients()
  initQuotes()
  initConfig()
}, [initContracts, initClients, initQuotes, initConfig])


  // Form state
  const [clientId, setClientId] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [templateId, setTemplateId] = useState('reglazing')
  const [terms, setTerms] = useState('')
  const [scope, setScope] = useState('')
  const [warranty, setWarranty] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [propertyStreet, setPropertyStreet] = useState('')
  const [propertyCity, setPropertyCity] = useState('')
  const [propertyState, setPropertyState] = useState('')
  const [propertyZip, setPropertyZip] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [status, setStatus] = useState<ContractStatus>('draft')
  const [notes, setNotes] = useState('')
  const [dueTerms, setDueTerms] = useState<string>('due_upon_completion')

  // Signature state
  const [showClientSig, setShowClientSig] = useState(false)
  const [showContractorSig, setShowContractorSig] = useState(false)
  const [clientName, setClientName] = useState('')
  const [contractorName, setContractorName] = useState('Joseph Zipko')

  const clientSigRef = useRef<HTMLCanvasElement>(null)
  const contractorSigRef = useRef<HTMLCanvasElement>(null)
  const clientSigPad = useRef<SignaturePad | null>(null)
  const contractorSigPad = useRef<SignaturePad | null>(null)

  const labels = config?.labels
  const templates = config?.contractTemplates || []

  // Load existing contract
  useEffect(() => {
    console.log('Contract Detail - URL id:', id, 'isNew:', isNew, 'contracts length:', contracts.length)
   if (!isNew && editId) {
  const existing = contracts.find((c) => c.id === editId)

      if (existing) {
        setContract(existing)
        setClientId(existing.clientId)
        setQuoteId(existing.quoteId || '')
        setTemplateId(existing.templateId)
        setTerms(existing.terms)
        setScope(existing.scope)
        setWarranty(existing.warranty)
        setStartDate(existing.startDate || '')
        setEndDate(existing.endDate || '')
        setPropertyAddress(existing.propertyAddress || '')
        // Parse address if it exists
        if (existing.propertyAddress) {
          const parts = existing.propertyAddress.split('\n')
          setPropertyStreet(parts[0] || '')
          if (parts[1]) {
            const cityStateZip = parts[1].match(/^(.+),\s*([A-Z]{2})\s+(\d{5})$/)
            if (cityStateZip) {
              setPropertyCity(cityStateZip[1])
              setPropertyState(cityStateZip[2])
              setPropertyZip(cityStateZip[3])
            }
          }
        }
        setTotalAmount(existing.totalAmount?.toString() || '')
        setStatus(existing.status)
        setNotes(existing.notes || '')
        setDueTerms(existing.dueTerms || 'due_upon_completion')
      } else {
        console.log('Contract not found in store')
      }
    }
  }, [id, isNew, contracts])

  // Reset all form fields when starting a brand-new contract
useEffect(() => {
  if (isNew) {
    setContract(null);
    setClientId('');
    setQuoteId('');
    setTemplateId('reglazing');
    setTerms('');
    setScope('');
    setWarranty('');
    setStartDate('');
    setEndDate('');
    setPropertyStreet('');
    setPropertyCity('');
    setPropertyState('');
    setPropertyZip('');
    setNotes('');
    setTotalAmount('');
    setStatus('draft');
    setDueTerms('due_upon_completion');
  }
}, [isNew]);

// Load template when changed
useEffect(() => {
  const template = templates.find((t) => t.id === templateId)
  if (template && isNew) {
    setTerms(template.terms)
    setScope(template.scope)
    setWarranty(template.warranty)
  }
}, [templateId, templates, isNew])


  // Initialize signature pads
  useEffect(() => {
    if (showClientSig && clientSigRef.current && !clientSigPad.current) {
      clientSigPad.current = new SignaturePad(clientSigRef.current, {
        penColor: '#e8d487', // Gold color to match theme
        backgroundColor: 'rgb(20, 20, 20)', // Dark background
      })
    }
    if (showContractorSig && contractorSigRef.current && !contractorSigPad.current) {
      contractorSigPad.current = new SignaturePad(contractorSigRef.current, {
        penColor: '#e8d487', // Gold color to match theme
        backgroundColor: 'rgb(20, 20, 20)', // Dark background
      })
    }
  }, [showClientSig, showContractorSig])

  const handleSave = async () => {
    if (!clientId) {
      useToastStore.getState().show("Please select a client");
      return
    }

    if (!terms || !scope || !warranty) {
      useToastStore.getState().show("Contract content is missing. Please wait for templates to load or enter contract text manually.")
      return
    }

    setLoading(true)
    try {
      const now = Date.now()
      const contractId = isNew ? `con-${Date.now()}` : id!

      const data: any = {
        id: contractId,
        clientId,
        templateId,
        terms,
        scope,
        warranty,
        status,
        createdAt: contract?.createdAt || now,
        updatedAt: now,
      }

      // Only add optional fields if they have values
      // Validate quoteId is a valid Firestore document ID
      // BUG FIX: Handle 'None' selection (empty string) and validate against loaded quotes
      if (quoteId && quoteId.trim() !== '') {
        const validQuote = quotes.find(q => q.id === quoteId)
        if (validQuote) {
          data.quoteId = quoteId
        } else {
          console.warn('Invalid quoteId selected:', quoteId, '- Quote not found in quotes array. Contract will be saved without quoteId.')
        }
      }
      // If quoteId is empty or 'None' was selected, omit it from the data object entirely
      
      if (startDate) data.startDate = startDate
      if (endDate) data.endDate = endDate
      // Combine address fields into propertyAddress
      if (propertyStreet || propertyCity || propertyState || propertyZip) {
        const addressLine1 = propertyStreet
        const addressLine2 = [propertyCity, propertyState, propertyZip].filter(Boolean).join(', ')
        data.propertyAddress = [addressLine1, addressLine2].filter(Boolean).join('\n')
      }
      if (totalAmount) data.totalAmount = parseFloat(totalAmount)
      
      // Calculate and save due date based on terms
      // BUG FIX: Never set dueDate to undefined - omit it instead
      data.dueTerms = dueTerms
      if (dueTerms === 'net_15') {
        data.dueDate = now + (15 * 24 * 60 * 60 * 1000)
      } else if (dueTerms === 'net_30') {
        data.dueDate = now + (30 * 24 * 60 * 60 * 1000)
      } else if (dueTerms === 'net_60') {
        data.dueDate = now + (60 * 24 * 60 * 60 * 1000)
      }
      // For 'due_upon_completion', don't set dueDate at all (omit the field)
      
      if (contract?.clientSignature) data.clientSignature = contract.clientSignature
      if (contract?.contractorSignature) data.contractorSignature = contract.contractorSignature
      if (notes) data.notes = notes

      console.log('Saving contract:', data)
      await upsert(data)
      useToastStore.getState().show("Contract saved successfully");
      // Navigate to the contract detail page
      if (isNew) {
        navigate(`/contracts/${contractId}`)
      } else {
        navigate('/contracts')
      }
    } catch (error: any) {
      console.error('Error saving contract:', error)
      useToastStore.getState().show(`Failed to save contract: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this contract?')) return

    setLoading(true)
    try {
      await remove(id!)
      useToastStore.getState().show('Contract deleted')
      navigate('/contracts')
    } catch (error) {
      console.error('Error deleting contract:', error)
      useToastStore.getState().show('Failed to delete contract')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!contract || !selectedClient || !config) {
      useToastStore.getState().show("Unable to generate PDF. Missing contract or client data.");
      return
    }
    try {
      await generateContractPDF(contract, selectedClient, config.businessProfile)
    } catch (error) {
      console.error('Error generating PDF:', error)
      useToastStore.getState().show("Failed to generate PDF");
    }
  }

  const handleClientSignature = async () => {
    console.log('handleClientSignature - contract:', contract?.id, 'isNew:', isNew)
    if (isNew || !contract?.id) {
      useToastStore.getState().show("Please save the contract first before adding signatures");
      return
    }
    if (!clientSigPad.current || clientSigPad.current.isEmpty()) {
      useToastStore.getState().show("Please provide a signature");
      return
    }
    if (!clientName.trim()) {
      useToastStore.getState().show("Please enter client name");
      return
    }

    try {
      const contractId = contract.id
      console.log('Saving client signature for contract:', contractId)
      const dataUrl = clientSigPad.current.toDataURL()
      await addSignature(contractId, 'client', {
        dataUrl,
        name: clientName.trim(),
        date: Date.now(),
      })
      
      console.log('Navigating to:', `/contracts/${contractId}`)
      // Direct navigation to the contract URL using the actual contract ID
      window.location.href = `/contracts/${contractId}`
    } catch (error) {
      console.error('Error saving signature:', error)
      useToastStore.getState().show("Failed to save signature");
    }
  }

  const handleContractorSignature = async () => {
    if (isNew || !contract?.id) {
      useToastStore.getState().show("Please save the contract first before adding signatures");
      return
    }
    if (!contractorSigPad.current || contractorSigPad.current.isEmpty()) {
      useToastStore.getState().show("Please provide a signature");
      return
    }
    if (!contractorName.trim()) {
      useToastStore.getState().show("Please enter contractor name");
      return
    }

    try {
      const contractId = contract.id
      const dataUrl = contractorSigPad.current.toDataURL()
      await addSignature(contractId, 'contractor', {
        dataUrl,
        name: contractorName.trim(),
        date: Date.now(),
      })
      
      // Direct navigation to the contract URL using the actual contract ID
      window.location.href = `/contracts/${contractId}`
    } catch (error) {
      console.error('Error saving signature:', error)
      useToastStore.getState().show("Failed to save signature");
    }
  }

    // -------------------------------
  // AUTO-SAVE DEBOUNCER (Mode B)
  // -------------------------------
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null)

  const triggerAutoSave = () => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current)
    }

    // Debounce 1.2s
    autoSaveTimeout.current = setTimeout(() => {
      handleAutoSave()
    }, 1200)
  }

  // Auto-save handler (Mode B saves content fields ONLY)
  const handleAutoSave = () => {
    if (isNew || !contract?.id) return // Do not autosave unsaved contracts
      setSaveState('saving')


    // Collect ONLY editable contract fields (Mode B)
        const partial: Partial<Contract> & { id: string } = {

      id: contract.id,
      terms,
      scope,
      warranty,
      notes,
      startDate,
      endDate,
      totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
      dueTerms,
      status,
      propertyAddress: [propertyStreet, [propertyCity, propertyState, propertyZip].filter(Boolean).join(', ')].filter(Boolean).join('\n'),
      updatedAt: Date.now(),
    }

        // Remove undefined fields to satisfy upsert() strict typing
    Object.keys(partial).forEach((key) => {
      if (partial[key as keyof Contract] === undefined) {
        delete partial[key as keyof Contract]
      }
    })


    // Do NOT show success toasts on auto-save
      upsert(partial as Contract).then(() => setSaveState('saved')).catch(() => {


      useToastStore.getState().show("Auto-save failed")
    })
  }

 
  const selectedClient = clients.find((c) => c.id === clientId)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/contracts')}
            className="text-[#e8d487] hover:text-white transition flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contracts
          </button>
          <h1 className="text-2xl font-semibold text-[#e8d487]">
            {isNew ? 'New Contract' : contract?.id}
          </h1>
        </div>

        <div className="flex gap-2">
          {!isNew && (
            <>
              <button
                onClick={handleGeneratePDF}
                className="btn-secondary flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate PDF
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="btn-secondary flex items-center gap-2"
                style={{ color: '#ff4444' }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : labels?.actionSave || 'Save'}
          </button>
          {saveState === 'saving' && (
  <span className="text-xs text-gray-500 mt-2">Saving…</span>
)}
{saveState === 'saved' && (
  <span className="text-xs text-gray-500 mt-2">Saved</span>
)}

        </div>
      </div>

      {/* CLIENT & QUOTE */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#e8d487]">Client & Quote</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input-field"
              disabled={!isNew}
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Related Quote</label>
            <select
              value={quoteId}
              onChange={(e) => setQuoteId(e.target.value)}
              className="input-field"
            >
              <option value="">None</option>
              {quotes
                .filter((q) => q.clientId === clientId)
                .map((q) => (
                  <option key={q.id} value={q.id}>{q.quoteNumber} - ${q.total}</option>
                ))}
            </select>
          </div>
        </div>

        {selectedClient && (
          <div className="text-sm text-gray-400 space-y-1 pt-2 border-t border-gray-800">
            <p>{selectedClient.phone}</p>
            <p>{selectedClient.email}</p>
            <p>{selectedClient.address}</p>
          </div>
        )}
      </div>

      {/* TEMPLATE & STATUS */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#e8d487]">Template & Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="input-field"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as ContractStatus); triggerAutoSave(); }}
              className="input-field"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="signed">Signed</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>
      </div>

      {/* PROJECT DETAILS */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#e8d487]">Project Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); triggerAutoSave(); }}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); triggerAutoSave(); }}
              className="input-field"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Street Address</label>
            <input
              type="text"
              value={propertyStreet}
              onChange={(e) => { setPropertyStreet(e.target.value); triggerAutoSave(); }}
              placeholder="123 Main St"
              className="input-field"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-500 mb-2">City</label>
              <input
                type="text"
                value={propertyCity}
                onChange={(e) => { setPropertyCity(e.target.value); triggerAutoSave(); }}
                placeholder="City"
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-2">State</label>
              <input
                type="text"
                value={propertyState}
                onChange={(e) => { setPropertyState(e.target.value.toUpperCase()); triggerAutoSave(); }}
                placeholder="ST"
                maxLength={2}
                className="input-field uppercase"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-2">ZIP Code</label>
              <input
                type="text"
                value={propertyZip}
                onChange={(e) => { setPropertyZip(e.target.value); triggerAutoSave(); }}
                placeholder="12345"
                maxLength={10}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Total Amount</label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => { setTotalAmount(e.target.value); triggerAutoSave(); }}
            placeholder="0.00"
            step="0.01"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Payment Terms</label>
          <select
            value={dueTerms}
            onChange={(e) => { setDueTerms(e.target.value); triggerAutoSave(); }}
            className="input-field"
          >
            <option value="due_upon_completion">Due Upon Completion</option>
            <option value="net_15">Net 15 Days</option>
            <option value="net_30">Net 30 Days</option>
            <option value="net_60">Net 60 Days</option>
          </select>
        </div>
      </div>

      {/* CONTRACT CONTENT */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#e8d487]">Contract Content</h2>
        
        <div>
          <label className="block text-xs text-gray-500 mb-2">Terms & Conditions</label>
          <textarea
            value={terms}
            onChange={(e) => { setTerms(e.target.value); triggerAutoSave(); }}

            rows={8}
            className="input-field font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Scope of Work</label>
          <textarea
            value={scope}
            onChange={(e) => { setScope(e.target.value); triggerAutoSave(); }}
            rows={8}
            className="input-field font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Warranty</label>
          <textarea
            value={warranty}
            onChange={(e) => { setWarranty(e.target.value); triggerAutoSave(); }}
            rows={5}
            className="input-field font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); triggerAutoSave(); }}
            rows={3}
            placeholder="Internal notes..."
            className="input-field"
          />
        </div>
      </div>

      {/* SIGNATURES */}
      {!isNew && (
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-[#e8d487]">Signatures</h2>
          
          {/* CLIENT SIGNATURE */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm text-gray-400">Client Signature</label>
              {!isNew && !contract?.clientSignature && (
                <button
                  onClick={() => {
                    // Auto-fill client name when opening signature pad
                    if (!showClientSig && selectedClient) {
                      setClientName(selectedClient.name)
                    }
                    setShowClientSig(!showClientSig)
                  }}
                  className="btn-secondary text-xs"
                >
                  {showClientSig ? 'Cancel' : 'Add Signature'}
                </button>
              )}
              {isNew && (
                <span className="text-xs text-gray-500 italic">Save contract first to add signatures</span>
              )}
            </div>

            {contract?.clientSignature ? (
              <div className="border border-gray-700 rounded-lg p-4 space-y-2">
                <img
                  src={contract.clientSignature.dataUrl}
                  alt="Client Signature"
                  className="h-24 border-b border-gray-700"
                />
                <p className="text-sm text-gray-400">
                  {contract.clientSignature.name} - {new Date(contract.clientSignature.date).toLocaleDateString()}
                </p>
                <button
                  onClick={async () => {
                    if (!contract?.id) {
                      useToastStore.getState().show('Cannot remove signature from unsaved contract')
                      return
                    }
                    if (confirm('Remove client signature?')) {
                      try {
                        await removeSignature(contract.id, 'client')
                        
                        // Direct navigation to the contract URL
                        window.location.href = `/contracts/${contract.id}`
                      } catch (error) {
                        console.error('Error removing signature:', error)
                        useToastStore.getState().show('Failed to remove signature')
                      }
                    }
                  }}
                  className="btn-secondary text-xs"
                  style={{ color: '#ff4444' }}
                >
                  Remove Signature
                </button>
              </div>
            ) : showClientSig ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Name"
                  className="input-field"
                />
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <canvas
                    ref={clientSigRef}
                    width={600}
                    height={200}
                    className="w-full bg-[#141414] cursor-crosshair"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => clientSigPad.current?.clear()}
                    className="btn-secondary text-xs"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleClientSignature}
                    className="btn-primary text-xs"
                  >
                    Save Signature
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500">
                No signature yet
              </div>
            )}
          </div>

          {/* CONTRACTOR SIGNATURE */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm text-gray-400">Contractor Signature</label>
              {!isNew && !contract?.contractorSignature && (
                <button
                  onClick={() => setShowContractorSig(!showContractorSig)}
                  className="btn-secondary text-xs"
                >
                  {showContractorSig ? 'Cancel' : 'Add Signature'}
                </button>
              )}
              {isNew && (
                <span className="text-xs text-gray-500 italic">Save contract first to add signatures</span>
              )}
            </div>

            {contract?.contractorSignature ? (
              <div className="border border-gray-700 rounded-lg p-4 space-y-2">
                <img
                  src={contract.contractorSignature.dataUrl}
                  alt="Contractor Signature"
                  className="h-24 border-b border-gray-700"
                />
                <p className="text-sm text-gray-400">
                  {contract.contractorSignature.name} - {new Date(contract.contractorSignature.date).toLocaleDateString()}
                </p>
                <button
                  onClick={async () => {
                    if (!contract?.id) {
                      useToastStore.getState().show('Cannot remove signature from unsaved contract')
                      return
                    }
                    if (confirm('Remove contractor signature?')) {
                      try {
                        await removeSignature(contract.id, 'contractor')
                        
                        // Direct navigation to the contract URL
                        window.location.href = `/contracts/${contract.id}`
                      } catch (error) {
                        console.error('Error removing signature:', error)
                        useToastStore.getState().show('Failed to remove signature')
                      }
                    }
                  }}
                  className="btn-secondary text-xs"
                  style={{ color: '#ff4444' }}
                >
                  Remove Signature
                </button>
              </div>
            ) : showContractorSig ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Contractor Name"
                  className="input-field"
                />
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <canvas
                    ref={contractorSigRef}
                    width={600}
                    height={200}
                    className="w-full bg-[#141414] cursor-crosshair"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => contractorSigPad.current?.clear()}
                    className="btn-secondary text-xs"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleContractorSignature}
                    className="btn-primary text-xs"
                  >
                    Save Signature
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500">
                No signature yet
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
