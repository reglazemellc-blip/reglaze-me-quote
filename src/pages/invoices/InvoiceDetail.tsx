// -------------------------------------------------------------
// InvoiceDetail.tsx — View and manage a single invoice
// -------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvoicesStore } from "@store/useInvoicesStore";
import { useClientsStore } from "@store/useClientsStore";
import type { Invoice, InvoiceStatus } from "@db/index";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, init, updateStatus, recordPayment, remove } = useInvoicesStore();
  const { clients, init: initClients } = useClientsStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      const found = invoices.find((i) => i.id === id);
      setInvoice(found || null);
    }
  }, [loading, id, invoices]);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name ?? "Unknown Client";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (ts: number | undefined) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  };

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!id) return;
    await updateStatus(id, status);
  };

  const handleRecordPayment = async () => {
    if (!id || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    await recordPayment(id, amount);
    setPaymentAmount("");
    setShowPaymentModal(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    await remove(id);
    navigate("/invoices");
  };

  const statusStyles: Record<InvoiceStatus, string> = {
    unpaid: "border-yellow-500/60 text-yellow-300 bg-yellow-500/10",
    partial: "border-orange-500/60 text-orange-300 bg-orange-500/10",
    paid: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10",
    overdue: "border-red-500/60 text-red-300 bg-red-500/10",
    refunded: "border-gray-500/60 text-gray-300 bg-gray-500/10",
  };

  const statusLabels: Record<InvoiceStatus, string> = {
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    refunded: "Refunded",
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400 mb-4">Invoice not found.</p>
        <button
          onClick={() => navigate("/invoices")}
          className="btn-outline-gold px-4 py-2"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const balance = invoice.total - (invoice.amountPaid || 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#e8d487] flex items-center gap-3">
            <span className="border-l-2 border-[#e8d487] pl-2">Invoice</span>
            {invoice.invoiceNumber && (
              <span className="text-sm text-gray-400">
                #{invoice.invoiceNumber}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(invoice.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/invoices/${id}/edit`)}
            className="btn-outline-gold px-4 py-2"
          >
            Edit
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-gold px-4 py-2"
          >
            Record Payment
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <span
          className={`px-3 py-1 rounded-full border text-sm ${
            statusStyles[invoice.status]
          }`}
        >
          {statusLabels[invoice.status]}
        </span>

        <select
          value={invoice.status}
          onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
          className="input text-sm"
        >
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Client Info */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold text-[#e8d487] mb-3">Client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Name</div>
            <div className="text-[#f5f3da]">
              {invoice.clientName || getClientName(invoice.clientId)}
            </div>
          </div>
          {invoice.clientPhone && (
            <div>
              <div className="text-gray-500">Phone</div>
              <div className="text-[#f5f3da]">{invoice.clientPhone}</div>
            </div>
          )}
          {invoice.clientEmail && (
            <div>
              <div className="text-gray-500">Email</div>
              <div className="text-[#f5f3da]">{invoice.clientEmail}</div>
            </div>
          )}
          {invoice.clientAddress && (
            <div>
              <div className="text-gray-500">Address</div>
              <div className="text-[#f5f3da] whitespace-pre-line">
                {invoice.clientAddress}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-[#e8d487] mb-3">
            Line Items
          </h2>
          <div className="space-y-2">
            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-2 border-b border-[#2a2414] last:border-b-0"
              >
                <div>
                  <div className="text-[#f5f3da]">{item.description}</div>
                  {item.serviceDescription && (
                    <div className="text-xs text-gray-500">
                      {item.serviceDescription}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[#f5f3da]">
                    {formatCurrency(item.total)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.qty} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold text-[#e8d487] mb-3">Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-[#f5f3da]">
              {formatCurrency(invoice.subtotal)}
            </span>
          </div>
          {invoice.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                Tax ({((invoice.taxRate || 0) * 100).toFixed(1)}%)
              </span>
              <span className="text-[#f5f3da]">
                {formatCurrency(invoice.tax)}
              </span>
            </div>
          )}
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="text-red-400">
                -{formatCurrency(invoice.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[#2a2414]">
            <span className="text-[#e8d487] font-semibold">Total</span>
            <span className="text-[#e8d487] font-semibold">
              {formatCurrency(invoice.total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Amount Paid</span>
            <span className="text-emerald-400">
              {formatCurrency(invoice.amountPaid || 0)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#2a2414]">
            <span className="text-[#e8d487] font-semibold">Balance Due</span>
            <span
              className={`font-semibold ${
                balance > 0 ? "text-yellow-400" : "text-emerald-400"
              }`}
            >
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-[#e8d487] mb-3">Notes</h2>
          <p className="text-[#f5f3da] text-sm whitespace-pre-line">
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Due Date */}
      {invoice.dueDate && (
        <div className="card p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Due Date</span>
            <span className="text-[#f5f3da]">{formatDate(invoice.dueDate)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-[#2a2414]">
        <button
          onClick={() => navigate("/invoices")}
          className="btn-outline-gold px-4 py-2"
        >
          Back to Invoices
        </button>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-400 text-sm"
        >
          Delete Invoice
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#e8d487] mb-4">
              Record Payment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Balance Due
                </label>
                <div className="text-xl text-[#e8d487] font-semibold">
                  {formatCurrency(balance)}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input w-full"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-outline-gold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="btn-gold px-4 py-2"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
