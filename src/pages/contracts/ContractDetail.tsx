// -------------------------------------------------------------
// ContractDetail.tsx — View and manage a single contract
// -------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContractsStore } from "@store/useContractsStore";
import { useClientsStore } from "@store/useClientsStore";
import type { Contract, ContractStatus, Signature } from "@db/index";
import SignatureModal from "@components/SignatureModal";

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, init, updateStatus, sign, remove } = useContractsStore();
  const { clients, init: initClients } = useClientsStore();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      await init();
      await initClients();
      setLoading(false);
    };
    load();
  }, [init, initClients]);

  useEffect(() => {
    if (!loading && id) {
      const found = contracts.find((c) => c.id === id);
      setContract(found || null);
    }
  }, [loading, id, contracts]);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name ?? "Unknown Client";
  };

  const formatDate = (ts: number | undefined) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  };

  const handleStatusChange = async (status: ContractStatus) => {
    if (!id) return;
    await updateStatus(id, status);
  };

  const handleSign = async (signature: Signature) => {
    if (!id) return;
    await sign(id, signature);
    setShowSignatureModal(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this contract?")) return;
    await remove(id);
    navigate("/contracts");
  };

  // Replace template placeholders with actual data
  const renderContent = (content: string) => {
    if (!contract) return content;
    return content
      .replace(/\{\{clientName\}\}/g, contract.clientName || getClientName(contract.clientId))
      .replace(/\{\{clientPhone\}\}/g, contract.clientPhone || "")
      .replace(/\{\{clientEmail\}\}/g, contract.clientEmail || "")
      .replace(/\{\{clientAddress\}\}/g, contract.clientAddress || "");
  };

  const statusStyles: Record<ContractStatus, string> = {
    draft: "border-gray-500/60 text-gray-300 bg-gray-500/10",
    sent: "border-yellow-500/60 text-yellow-300 bg-yellow-500/10",
    signed: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
    expired: "border-red-500/60 text-red-300 bg-red-500/10",
    canceled: "border-red-500/60 text-red-300 bg-red-500/10",
  };

  const statusLabels: Record<ContractStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    signed: "Signed",
    expired: "Expired",
    canceled: "Canceled",
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  if (!contract) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400 mb-4">Contract not found.</p>
        <button
          onClick={() => navigate("/contracts")}
          className="btn-outline-gold px-4 py-2"
        >
          Back to Contracts
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#e8d487] flex items-center gap-3">
            <span className="border-l-2 border-[#e8d487] pl-2">
              {contract.title}
            </span>
            {contract.contractNumber && (
              <span className="text-sm text-gray-400">
                #{contract.contractNumber}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(contract.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/contracts/${id}/edit`)}
            className="btn-outline-gold px-4 py-2"
          >
            Edit
          </button>
          {!contract.signature && (
            <button
              onClick={() => setShowSignatureModal(true)}
              className="btn-gold px-4 py-2"
            >
              Sign Contract
            </button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span
          className={`px-3 py-1 rounded-full border text-sm ${
            statusStyles[contract.status]
          }`}
        >
          {statusLabels[contract.status]}
        </span>

        <select
          value={contract.status}
          onChange={(e) => handleStatusChange(e.target.value as ContractStatus)}
          className="input text-sm"
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="signed">Signed</option>
          <option value="expired">Expired</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Client Info */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold text-[#e8d487] mb-3">Client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Name</div>
            <div className="text-[#f5f3da]">
              {contract.clientName || getClientName(contract.clientId)}
            </div>
          </div>
          {contract.clientPhone && (
            <div>
              <div className="text-gray-500">Phone</div>
              <div className="text-[#f5f3da]">{contract.clientPhone}</div>
            </div>
          )}
          {contract.clientEmail && (
            <div>
              <div className="text-gray-500">Email</div>
              <div className="text-[#f5f3da]">{contract.clientEmail}</div>
            </div>
          )}
          {contract.clientAddress && (
            <div>
              <div className="text-gray-500">Address</div>
              <div className="text-[#f5f3da] whitespace-pre-line">
                {contract.clientAddress}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contract Content */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold text-[#e8d487] mb-3">
          Contract Content
        </h2>
        <div
          className="prose prose-invert max-w-none text-[#f5f3da] text-sm"
          dangerouslySetInnerHTML={{ __html: renderContent(contract.content) }}
        />
      </div>

      {/* Terms */}
      {contract.terms && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-[#e8d487] mb-3">
            Additional Terms
          </h2>
          <p className="text-[#f5f3da] text-sm whitespace-pre-line">
            {contract.terms}
          </p>
        </div>
      )}

      {/* Signature Section */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold text-[#e8d487] mb-3">Signature</h2>
        {contract.signature ? (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 inline-block">
              <img
                src={contract.signature.dataUrl}
                alt="Client Signature"
                className="max-h-24"
              />
            </div>
            <div className="text-xs text-gray-500">
              Signed on {formatDate(contract.signedAt)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            This contract has not been signed yet.
            <button
              onClick={() => setShowSignatureModal(true)}
              className="ml-2 text-[#e8d487] hover:underline"
            >
              Sign now
            </button>
          </div>
        )}
      </div>

      {/* Related Documents */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold text-[#e8d487] mb-3">
          Related Documents
        </h2>
        <div className="space-y-2 text-sm">
          {contract.quoteId && (
            <div className="flex justify-between items-center py-2 border-b border-[#2a2414]">
              <span className="text-gray-400">Quote</span>
              <button
                onClick={() => navigate(`/quotes/${contract.quoteId}`)}
                className="text-[#e8d487] hover:underline"
              >
                View Quote →
              </button>
            </div>
          )}
          {contract.invoiceId && (
            <div className="flex justify-between items-center py-2 border-b border-[#2a2414]">
              <span className="text-gray-400">Invoice</span>
              <button
                onClick={() => navigate(`/invoices/${contract.invoiceId}`)}
                className="text-[#e8d487] hover:underline"
              >
                View Invoice →
              </button>
            </div>
          )}
          {!contract.quoteId && !contract.invoiceId && (
            <div className="text-gray-500">No related documents.</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-[#2a2414]">
        <button
          onClick={() => navigate("/contracts")}
          className="btn-outline-gold px-4 py-2"
        >
          Back to Contracts
        </button>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-400 text-sm"
        >
          Delete Contract
        </button>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={(dataUrl) =>
            handleSign({ dataUrl, signedAt: new Date().toISOString() })
          }
        />
      )}
    </div>
  );
}
