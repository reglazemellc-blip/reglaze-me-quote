/**
 * Documents Page
 * Share preparation and care documents with clients
 * Supports both Firebase Storage PDFs and fallback text-generated PDFs
 */

import { useEffect, useState } from 'react'
import { FileText, Upload, Trash2, Download } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage'
import { storage } from '../firebase'
import { useConfigStore } from '@store/useConfigStore'
import { useToastStore } from '@store/useToastStore'
import { shareDocument, generateDocumentEmail, generateTextDocumentPDF } from '@utils/share'

type Document = {
  id: string
  name: string
  description: string
  pdfUrl?: string // Firebase Storage URL if uploaded
  fallbackContent: string // Text content for fallback PDF generation
}

// Document definitions with fallback content
const documentDefinitions: Document[] = [
  {
    id: 'manager-pre-job',
    name: 'Manager Pre-Job Confirmation',
    description: 'Pre-job checklist for managers including safety and quality verification',
    fallbackContent: `MANAGER PRE-JOB CONFIRMATION

BEFORE REGLAZING APPOINTMENT:

□ Client has cleared bathroom of all items (toiletries, rugs, shower curtains, etc.)
□ Client has provided access to bathroom
□ Water shutoff location confirmed (if elected)
□ Adequate ventilation confirmed (window or fan)
□ Work area is clean and dry

SAFETY CHECKLIST:

□ Proper ventilation equipment ready
□ Safety equipment prepared (respirator, gloves, eye protection)
□ Chemical storage containers ready
□ Fire extinguisher accessible
□ Client and pets removed from work area

QUALITY CHECKLIST:

□ Surface condition inspected and documented
□ Any damage or concerns noted and photographed
□ Client expectations confirmed in writing
□ Estimated completion time communicated

NOTES:
_________________________________
_________________________________
_________________________________

Manager Signature: _________________ Date: _________`
  },
  {
    id: 'preparation-care',
    name: 'Preparation & Care Instructions',
    description: 'Client instructions for before and after reglazing appointment',
    fallbackContent: `PREPARATION & CARE INSTRUCTIONS

BEFORE YOUR APPOINTMENT:

1. Remove all items from bathroom
   - Toiletries, soap, shampoo bottles
   - Rugs, bath mats, shower curtains
   - Toilet tank covers and decorations

2. Clean the surface
   - Remove soap scum and residue
   - Wipe down all surfaces to be reglazed
   - Ensure surface is completely dry

3. Provide access
   - Clear path to bathroom
   - Ensure we can access water shutoff (if applicable)
   - Open windows or ensure ventilation fan works

4. Plan to be away
   - You, family members, and pets must leave for 6-8 hours
   - Fumes from reglazing process require ventilation
   - DO NOT enter bathroom until we confirm it's safe

AFTER REGLAZING - CRITICAL FIRST 48 HOURS:

DO NOT USE OR TOUCH for 48 hours minimum
Keep bathroom well-ventilated (window open or fan on)
DO NOT place anything on the surface
DO NOT turn on shower or run water on reglazed surface

AFTER 5 DAYS - REGULAR USE:

Surface is fully cured and ready for normal use
Use ONLY non-abrasive cleaners
Avoid dropping heavy objects
Use bath mats to protect surface

Questions? Call us: We're here to help!`
  },
  {
    id: 'homeowner-prep-care',
    name: 'Homeowner Preparation & Care',
    description: 'Comprehensive guide for homeowners about reglazing process and care',
    fallbackContent: `HOMEOWNER PREPARATION & CARE GUIDE

WHAT IS REGLAZING?

Reglazing (also called refinishing) restores your bathtub, tile, or sink to like-new condition. We apply a durable coating that bonds to the existing surface, giving you a fresh, glossy finish at a fraction of the cost of replacement.

PREPARING YOUR HOME:

Clear the Bathroom (Day Before):
□ Remove ALL items from counters, tub, and shower
□ Take down shower curtains and bath mats
□ Clear decorations and toilet tank covers
□ Move towels and toiletries to another room

Ventilation (Very Important):
□ Open bathroom window if you have one
□ Test bathroom exhaust fan (should be working)
□ We will provide additional ventilation during work

Safety:
□ Leave home with family and pets during reglazing (6-8 hours)
□ The reglazing process uses strong-smelling chemicals
□ We'll notify you when it's safe to return

CARING FOR YOUR NEW SURFACE:

First 48 Hours - CRITICAL:
Absolutely NO use or contact
Keep window open or fan running continuously
Do not place anything on the surface
Do not turn on water over reglazed area

After Day 5 - Full Use:
Surface is fully cured
You can use your bathroom normally
Follow cleaning guidelines

DAILY CLEANING (After Curing):

DO Use:
Mild liquid cleaners (Formula 409, Fantastik)
Soft cloths or non-abrasive sponges

NEVER Use:
Bleach products
Abrasive powders (Ajax, Comet)
Scouring pads or steel wool
Magic Erasers (they're abrasive!)

With proper care, your reglazed surface will look beautiful for 10-15 years. Thank you for trusting us with your home!`
  }
]

export default function Documents() {
  const { config } = useConfigStore()
  const [documents, setDocuments] = useState<Document[]>(documentDefinitions)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  // Load PDF URLs from Firebase Storage on mount
  useEffect(() => {
    loadDocumentUrls()
  }, [])

  const loadDocumentUrls = async () => {
    try {
      const docsRef = ref(storage, 'documents')
      const result = await listAll(docsRef)

      const urlMap: Record<string, string> = {}

      for (const item of result.items) {
        const url = await getDownloadURL(item)
        // Extract document ID from filename (e.g., "manager-pre-job.pdf" -> "manager-pre-job")
        const docId = item.name.replace('.pdf', '')
        urlMap[docId] = url
      }

      // Update documents with URLs
      setDocuments(prev => prev.map(doc => ({
        ...doc,
        pdfUrl: urlMap[doc.id]
      })))
    } catch (error) {
      // Storage folder might not exist yet, that's OK
      console.log('No uploaded documents found in storage')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPDF = async (docId: string, file: File) => {
    if (!file.type.includes('pdf')) {
      useToastStore.getState().show('Please upload a PDF file')
      return
    }

    setUploading(docId)
    try {
      const fileRef = ref(storage, `documents/${docId}.pdf`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)

      setDocuments(prev => prev.map(doc =>
        doc.id === docId ? { ...doc, pdfUrl: url } : doc
      ))

      useToastStore.getState().show('PDF uploaded successfully!')
    } catch (error) {
      console.error('Error uploading PDF:', error)
      useToastStore.getState().show('Failed to upload PDF')
    } finally {
      setUploading(null)
    }
  }

  const handleDeletePDF = async (docId: string) => {
    if (!confirm('Remove uploaded PDF? The document will use generated content instead.')) return

    try {
      const fileRef = ref(storage, `documents/${docId}.pdf`)
      await deleteObject(fileRef)

      setDocuments(prev => prev.map(doc =>
        doc.id === docId ? { ...doc, pdfUrl: undefined } : doc
      ))

      useToastStore.getState().show('PDF removed')
    } catch (error) {
      console.error('Error deleting PDF:', error)
      useToastStore.getState().show('Failed to remove PDF')
    }
  }

  const handlePreviewPDF = async (doc: Document) => {
    if (doc.pdfUrl) {
      // Open uploaded PDF in new tab
      window.open(doc.pdfUrl, '_blank')
    } else {
      // Generate and preview fallback PDF
      if (!config) return
      const blob = await generateTextDocumentPDF(
        doc.name,
        doc.fallbackContent,
        config.businessProfile.companyName
      )
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  const handleShareDocument = async (doc: Document) => {
    if (!config) {
      useToastStore.getState().show("Unable to share document. Configuration not loaded.")
      return
    }

    try {
      let blob: Blob
      let filename: string

      if (doc.pdfUrl) {
        // Fetch the uploaded PDF from Firebase Storage
        const response = await fetch(doc.pdfUrl)
        blob = await response.blob()
        filename = `${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      } else {
        // Generate fallback PDF from text content
        blob = await generateTextDocumentPDF(
          doc.name,
          doc.fallbackContent,
          config.businessProfile.companyName
        )
        filename = `${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      }

      // Generate email text
      const emailText = generateDocumentEmail({
        clientName: 'Customer',
        companyName: config.businessProfile.companyName,
        documentName: doc.name,
        message: `Please find attached: ${doc.name}`,
        phone: config.businessProfile.phone,
        email: config.businessProfile.email,
      })

      await shareDocument({
        title: `${doc.name} - ${config.businessProfile.companyName}`,
        message: emailText,
        pdfBlob: blob,
        pdfFileName: filename,
      })

      useToastStore.getState().show(`${doc.name} shared successfully!`)
    } catch (error: any) {
      if (error.message === 'CANCELLED') return
      console.error('Error sharing document:', error)
      useToastStore.getState().show("Failed to share document")
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="text-gray-400">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#e8d487] mb-2">Documents</h1>
        <p className="text-gray-400 text-sm">
          Share preparation and care instructions with your clients. Upload your own professional PDFs or use auto-generated versions.
        </p>
      </div>

      <div className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#e8d487]" />
                <div>
                  <h2 className="text-lg font-semibold text-white">{doc.name}</h2>
                  <p className="text-sm text-gray-400">{doc.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreviewPDF(doc)}
                  className="btn-secondary px-3 py-2 text-sm flex items-center gap-1"
                  title="Preview PDF"
                >
                  <Download className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleShareDocument(doc)}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Share
                </button>
              </div>
            </div>

            {/* PDF Status and Upload */}
            <div className="bg-black/20 rounded-lg p-4 border border-gray-800">
              {doc.pdfUrl ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Custom PDF uploaded</span>
                  </div>
                  <button
                    onClick={() => handleDeletePDF(doc.id)}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Using auto-generated PDF. Upload your own professional version:
                  </div>
                  <label className="btn-secondary px-3 py-2 text-sm flex items-center gap-1 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploading === doc.id ? 'Uploading...' : 'Upload PDF'}
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={uploading === doc.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadPDF(doc.id, file)
                        e.target.value = '' // Reset input
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
