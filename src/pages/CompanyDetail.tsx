// -------------------------------------------------------------
// CompanyDetail.tsx — View/Edit Company and its Properties/Units
// -------------------------------------------------------------

import { useCompaniesStore } from "@store/useCompaniesStore";
import { useConfigStore } from "@store/useConfigStore";
import { useToastStore } from "@store/useToastStore";
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Plus,
  Trash2,
  ChevronDown,
  Calendar,
  FileText,
  ArrowLeft,
} from "lucide-react";
import type { Company, Property, WorkflowStatus } from "@db/index";

// Workflow status configuration
const workflowStatuses: { value: WorkflowStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-gray-600" },
  { value: "docs_sent", label: "Docs Sent", color: "bg-yellow-600" },
  { value: "waiting_prejob", label: "Waiting Pre-Job", color: "bg-orange-600" },
  { value: "ready_to_schedule", label: "Ready to Schedule", color: "bg-cyan-600" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-600" },
  { value: "in_progress", label: "In Progress", color: "bg-indigo-600" },
  { value: "completed", label: "Completed", color: "bg-green-600" },
  { value: "invoiced", label: "Invoiced", color: "bg-purple-600" },
  { value: "paid", label: "Paid", color: "bg-emerald-600" },
];

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, properties, init, loading, upsertCompany, removeCompany, upsertProperty, removeProperty, getPropertiesByCompany } = useCompaniesStore();
  const { config } = useConfigStore();

  const [isNew, setIsNew] = useState(false);
  const [company, setCompany] = useState<Partial<Company>>({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newProperty, setNewProperty] = useState<Partial<Property>>({
    address: "",
    unit: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Load data on mount
  useEffect(() => {
    init();
  }, [init]);

  // Load company data
  useEffect(() => {
    if (id === "new") {
      setIsNew(true);
      return;
    }

    if (loading) return;

    const found = companies.find((c) => c.id === id);
    if (found) {
      setCompany(found);
      setIsNew(false);
    } else if (!loading && companies.length > 0) {
      // Only redirect if we've loaded companies and this one doesn't exist
      navigate("/companies");
    }
  }, [id, companies, loading, navigate]);

  // Get properties for this company
  const companyProperties = useMemo(() => {
    if (!id || id === "new") return [];
    return getPropertiesByCompany(id);
  }, [id, properties, getPropertiesByCompany]);

  // Filter properties by status
  const filteredProperties = useMemo(() => {
    if (statusFilter === "all") return companyProperties;
    return companyProperties.filter((p) => p.workflowStatus === statusFilter);
  }, [companyProperties, statusFilter]);

  // Group properties by status
  const groupedByStatus = useMemo(() => {
    const groups: Record<WorkflowStatus, Property[]> = {} as any;
    workflowStatuses.forEach((s) => {
      groups[s.value] = filteredProperties.filter((p) => p.workflowStatus === s.value);
    });
    return groups;
  }, [filteredProperties]);

  // Save company
  const handleSave = async () => {
    if (!company.name?.trim()) {
      useToastStore.getState().show("Company name is required");
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertCompany(company);
      useToastStore.getState().show("Company saved!");

      if (isNew) {
        navigate(`/companies/${saved.id}`, { replace: true });
      }
    } catch (err) {
      console.error("Failed to save company:", err);
      useToastStore.getState().show("Failed to save company");
    } finally {
      setSaving(false);
    }
  };

  // Delete company
  const handleDelete = async () => {
    if (!confirm(`Delete "${company.name}" and all its properties? This cannot be undone.`)) return;

    try {
      await removeCompany(id!);
      useToastStore.getState().show("Company deleted");
      navigate("/companies");
    } catch (err) {
      console.error("Failed to delete company:", err);
      useToastStore.getState().show("Failed to delete company");
    }
  };

  // Add new property
  const handleAddProperty = async () => {
    if (!newProperty.address?.trim()) {
      useToastStore.getState().show("Property address is required");
      return;
    }

    try {
      await upsertProperty({
        ...newProperty,
        companyId: id!,
        workflowStatus: "new",
      });
      useToastStore.getState().show("Property added!");
      setNewProperty({ address: "", unit: "", city: "", state: "", zip: "", notes: "" });
      setShowAddProperty(false);
    } catch (err) {
      console.error("Failed to add property:", err);
      useToastStore.getState().show("Failed to add property");
    }
  };

  // Update property status
  const handleStatusChange = async (property: Property, newStatus: WorkflowStatus) => {
    try {
      await upsertProperty({ ...property, workflowStatus: newStatus });
      useToastStore.getState().show("Status updated");
    } catch (err) {
      console.error("Failed to update status:", err);
      useToastStore.getState().show("Failed to update status");
    }
  };

  // Delete property
  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm("Delete this property?")) return;

    try {
      await removeProperty(propertyId);
      useToastStore.getState().show("Property deleted");
    } catch (err) {
      console.error("Failed to delete property:", err);
      useToastStore.getState().show("Failed to delete property");
    }
  };

  // Toggle status group collapse
  const toggleStatus = (status: WorkflowStatus) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate("/companies")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#e8d487] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Companies
      </button>

      {/* COMPANY INFO CARD */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-[#e8d487]" />
          <h1 className="text-xl font-semibold text-[#e8d487]">
            {isNew ? "New Company" : company.name}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
            <input
              type="text"
              className="input w-full"
              placeholder="ABC Property Management"
              value={company.name || ""}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
            <input
              type="text"
              className="input w-full"
              placeholder="John Smith"
              value={company.contactName || ""}
              onChange={(e) => setCompany({ ...company, contactName: e.target.value })}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone</label>
            <input
              type="tel"
              className="input w-full"
              placeholder="(555) 555-5555"
              value={company.phone || ""}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              className="input w-full"
              placeholder="contact@company.com"
              value={company.email || ""}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
          </div>

          {/* Billing Address */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Billing Address</label>
            <input
              type="text"
              className="input w-full"
              placeholder="123 Main St"
              value={company.billingAddress || ""}
              onChange={(e) => setCompany({ ...company, billingAddress: e.target.value })}
            />
          </div>

          {/* City, State, Zip */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">City</label>
            <input
              type="text"
              className="input w-full"
              value={company.billingCity || ""}
              onChange={(e) => setCompany({ ...company, billingCity: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1">State</label>
              <input
                type="text"
                className="input w-full"
                value={company.billingState || ""}
                onChange={(e) => setCompany({ ...company, billingState: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Zip</label>
              <input
                type="text"
                className="input w-full"
                value={company.billingZip || ""}
                onChange={(e) => setCompany({ ...company, billingZip: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              className="input w-full h-24"
              placeholder="Additional notes..."
              value={company.notes || ""}
              onChange={(e) => setCompany({ ...company, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="btn-secondary text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Company
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold"
          >
            {saving ? "Saving..." : isNew ? "Create Company" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* PROPERTIES SECTION (only show if not new) */}
      {!isNew && (
        <>
          {/* Properties Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#e8d487]">Properties / Units</h2>
              <p className="text-xs text-gray-500">
                {companyProperties.length} {companyProperties.length === 1 ? "property" : "properties"}
              </p>
            </div>

            <div className="flex gap-3">
              {/* Status Filter */}
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-[#e8d487]/40 rounded-lg text-[#e8d487] bg-black/30 hover:bg-black/50"
                  onClick={() => {
                    const menu = document.getElementById("statusFilterMenu");
                    if (menu) menu.classList.toggle("hidden");
                  }}
                >
                  Filter: {statusFilter === "all" ? "All" : workflowStatuses.find((s) => s.value === statusFilter)?.label}
                  <ChevronDown size={16} />
                </button>
                <div
                  id="statusFilterMenu"
                  className="hidden absolute right-0 mt-2 w-48 bg-[#111] border border-[#2a2a2a] rounded-lg shadow-lg z-50"
                >
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      document.getElementById("statusFilterMenu")?.classList.add("hidden");
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-black/40 text-gray-300"
                  >
                    All Statuses
                  </button>
                  {workflowStatuses.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => {
                        setStatusFilter(status.value);
                        document.getElementById("statusFilterMenu")?.classList.add("hidden");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-black/40 text-gray-300 flex items-center gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full ${status.color}`} />
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Property Button */}
              <button
                className="btn-gold whitespace-nowrap flex items-center gap-2"
                onClick={() => setShowAddProperty(true)}
              >
                <Plus className="w-4 h-4" />
                Add Property
              </button>
            </div>
          </div>

          {/* Add Property Form */}
          {showAddProperty && (
            <div className="card p-4 border-2 border-[#e8d487]/50">
              <h3 className="text-sm font-semibold text-[#e8d487] mb-4">Add New Property</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Address *"
                    value={newProperty.address || ""}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Unit #"
                    value={newProperty.unit || ""}
                    onChange={(e) => setNewProperty({ ...newProperty, unit: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="City"
                    value={newProperty.city || ""}
                    onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="State"
                    value={newProperty.state || ""}
                    onChange={(e) => setNewProperty({ ...newProperty, state: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Zip"
                    value={newProperty.zip || ""}
                    onChange={(e) => setNewProperty({ ...newProperty, zip: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddProperty(false);
                    setNewProperty({ address: "", unit: "", city: "", state: "", zip: "", notes: "" });
                  }}
                >
                  Cancel
                </button>
                <button className="btn-gold" onClick={handleAddProperty}>
                  Add Property
                </button>
              </div>
            </div>
          )}

          {/* Properties List - Grouped by Status */}
          {companyProperties.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No properties yet.</p>
              <p className="text-sm mt-2">Add your first property to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflowStatuses.map((status) => {
                const statusProperties = groupedByStatus[status.value];
                if (statusProperties.length === 0 && statusFilter !== "all") return null;
                if (statusProperties.length === 0) return null;

                return (
                  <div key={status.value} className="border border-[#2a2414] rounded-lg overflow-hidden">
                    {/* Status Header */}
                    <button
                      onClick={() => toggleStatus(status.value)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-black/30 hover:bg-black/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span className="text-sm font-semibold text-[#e8d487]">
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({statusProperties.length})
                        </span>
                      </div>
                      <span className="text-[#e8d487]">
                        {collapsed[status.value] ? "▸" : "▾"}
                      </span>
                    </button>

                    {/* Properties in this status */}
                    {!collapsed[status.value] && (
                      <div className="divide-y divide-[#2a2414]">
                        {statusProperties.map((property) => (
                          <PropertyCard
                            key={property.id}
                            property={property}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteProperty}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Property Card Component
function PropertyCard({
  property,
  onStatusChange,
  onDelete,
}: {
  property: Property;
  onStatusChange: (property: Property, status: WorkflowStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const currentStatus = workflowStatuses.find((s) => s.value === property.workflowStatus) || workflowStatuses[0];

  return (
    <div className="p-4 bg-black/20 hover:bg-black/40 transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-white">
              {property.address}
              {property.unit && <span className="text-[#e8d487] ml-2">Unit {property.unit}</span>}
            </span>
          </div>

          {(property.city || property.state || property.zip) && (
            <div className="mt-1 text-sm text-gray-400">
              {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
            </div>
          )}

          {/* Document Tracking & Schedule Info */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {property.documentTracking?.preJobSent && (
              <span className="px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-700/50">
                Pre-Job Sent
              </span>
            )}
            {property.documentTracking?.preJobReceived && (
              <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-300 border border-green-700/50">
                Pre-Job Received
              </span>
            )}
            {property.scheduledDate && (
              <span className="px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {property.scheduledDate}
                {property.scheduledTime && ` @ ${property.scheduledTime}`}
              </span>
            )}
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`px-3 py-1 text-xs rounded-full ${currentStatus.color} text-white flex items-center gap-1`}
            >
              {currentStatus.label}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-[#111] border border-[#2a2a2a] rounded-lg shadow-lg z-50">
                {workflowStatuses.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      onStatusChange(property, status.value);
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-black/40 text-gray-300 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${status.color}`} />
                    {status.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onDelete(property.id)}
            className="p-1.5 text-gray-500 hover:text-red-400 transition"
            title="Delete property"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
