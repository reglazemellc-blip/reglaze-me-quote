import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCompaniesStore } from "@store/useCompaniesStore";
import { useQuotesStore } from "@store/useQuotesStore";
import type { Property, Quote } from "@db/index";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";


export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, init, loading: propertiesLoading } = useCompaniesStore();
  const { getQuotesByProperty } = useQuotesStore();

  const [property, setProperty] = useState<Property | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  // Edit state
  const [editingSection, setEditingSection] = useState<"manager" | "maintenance" | null>(null);
  const [editValues, setEditValues] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!id) return;
    const found = properties.find((p) => p.id === id) || null;
    setProperty(found);
  }, [id, properties]);

  useEffect(() => {
    if (!id) return;
    setQuotesLoading(true);
    setQuotesError(null);
    getQuotesByProperty(id)
      .then((result) => setQuotes(result))
      .catch((err) => {
        console.error("Failed to load quotes for property", err);
        setQuotesError("Failed to load quotes");
      })
      .finally(() => setQuotesLoading(false));
  }, [id, getQuotesByProperty]);

  const locationLine = useMemo(() => {
    if (!property) return "";
    return [property.city, property.state, property.zip].filter(Boolean).join(", ");
  }, [property]);

  // Start editing
  const handleEdit = (section: "manager" | "maintenance") => {
    setEditingSection(section);
    setEditValues(property ? { ...property } : null);
    setSaveError(null);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingSection(null);
    setEditValues(null);
    setSaveError(null);
  };

  // Handle input change
  const handleChange = (field: keyof Property, value: string) => {
    if (!editValues) return;
    setEditValues({ ...editValues, [field]: value });
  };

  // Save changes
  const handleSave = async () => {
    if (!property || !editValues) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ref = doc(db, "properties", property.id);
      let updateFields: Partial<Property> = {};
      if (editingSection === "manager") {
        updateFields = {
          propertyManagerName: editValues.propertyManagerName || "",
          propertyManagerPhone: editValues.propertyManagerPhone || "",
          propertyManagerEmail: editValues.propertyManagerEmail || "",
        };
      } else if (editingSection === "maintenance") {
        updateFields = {
          maintenanceName: editValues.maintenanceName || "",
          maintenancePhone: editValues.maintenancePhone || "",
          maintenanceEmail: editValues.maintenanceEmail || "",
        };
      }
      await updateDoc(ref, updateFields);
      setEditingSection(null);
      setEditValues(null);
      // Update local property state
      setProperty({ ...property, ...updateFields });
    } catch (err) {
      setSaveError("Failed to save changes.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="card p-6">
        <p className="text-gray-300">Property not found.</p>
      </div>
    );
  }

  if (propertiesLoading && !property) {
    return (
      <div className="card p-6">
        <p className="text-gray-300">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="card p-6">
        <p className="text-gray-300">Property not found.</p>
        <Link to="/companies" className="btn-outline-gold mt-4 inline-block">
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8d487]">Property</h1>
          <p className="text-sm text-gray-400">{property.address}</p>
          {locationLine && <p className="text-sm text-gray-500">{locationLine}</p>}
        </div>
        <button
          className="btn-gold"
          onClick={() => navigate(`/quotes/new?propertyId=${property.id}&companyId=${property.companyId}`)}
        >
          + New Quote
        </button>
      </div>

      <div className="card p-6 space-y-2">
        <div className="flex flex-wrap gap-4 text-sm text-gray-200">
          <span className="px-2 py-1 rounded bg-black/40 border border-[#2a2a2a]">
            Status: {property.workflowStatus || "new"}
          </span>
          {property.scheduledDate && (
            <span className="px-2 py-1 rounded bg-black/40 border border-[#2a2a2a]">
              Scheduled: {property.scheduledDate}
              {property.scheduledTime ? ` @ ${property.scheduledTime}` : ""}
            </span>
          )}
        </div>
        {property.notes && <p className="text-sm text-gray-300 mt-2">{property.notes}</p>}

        <div className="grid grid-cols-1 md-grid-cols-2 gap-3 text-sm text-gray-300 mt-3">
          <div className="p-3 rounded bg-black/30 border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="text-gray-400 text-xs mb-1">Property Manager</div>
              {editingSection !== "manager" && (
                <button className="btn-outline-gold text-xs px-2 py-1" onClick={() => handleEdit("manager")}>
                  Edit
                </button>
              )}
            </div>
            {editingSection === "manager" && editValues ? (
              <div className="space-y-2 mt-2">
                <input
                  className="input input-sm w-full"
                  type="text"
                  placeholder="Name"
                  value={editValues.propertyManagerName || ""}
                  onChange={e => handleChange("propertyManagerName", e.target.value)}
                />
                <input
                  className="input input-sm w-full"
                  type="text"
                  placeholder="Phone"
                  value={editValues.propertyManagerPhone || ""}
                  onChange={e => handleChange("propertyManagerPhone", e.target.value)}
                />
                <input
                  className="input input-sm w-full"
                  type="email"
                  placeholder="Email"
                  value={editValues.propertyManagerEmail || ""}
                  onChange={e => handleChange("propertyManagerEmail", e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="btn-gold btn-sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                {saveError && <div className="text-red-400 text-xs mt-1">{saveError}</div>}
              </div>
            ) : (
              <div>
                <div>Name: {property.propertyManagerName || "—"}</div>
                <div>Phone: {property.propertyManagerPhone || "—"}</div>
                <div>Email: {property.propertyManagerEmail || "—"}</div>
              </div>
            )}
          </div>
          <div className="p-3 rounded bg-black/30 border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="text-gray-400 text-xs mb-1">Maintenance</div>
              {editingSection !== "maintenance" && (
                <button className="btn-outline-gold text-xs px-2 py-1" onClick={() => handleEdit("maintenance")}>
                  Edit
                </button>
              )}
            </div>
            {editingSection === "maintenance" && editValues ? (
              <div className="space-y-2 mt-2">
                <input
                  className="input input-sm w-full"
                  type="text"
                  placeholder="Name"
                  value={editValues.maintenanceName || ""}
                  onChange={e => handleChange("maintenanceName", e.target.value)}
                />
                <input
                  className="input input-sm w-full"
                  type="text"
                  placeholder="Phone"
                  value={editValues.maintenancePhone || ""}
                  onChange={e => handleChange("maintenancePhone", e.target.value)}
                />
                <input
                  className="input input-sm w-full"
                  type="email"
                  placeholder="Email"
                  value={editValues.maintenanceEmail || ""}
                  onChange={e => handleChange("maintenanceEmail", e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="btn-gold btn-sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    className="btn-outline-gold btn-sm"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                {saveError && <div className="text-red-400 text-xs mt-1">{saveError}</div>}
              </div>
            ) : (
              <div>
                <div>Name: {property.maintenanceName || "—"}</div>
                <div>Phone: {property.maintenancePhone || "—"}</div>
                <div>Email: {property.maintenanceEmail || "—"}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#e8d487]">Quotes</h2>
        </div>

        {quotesLoading && <p className="text-gray-400 text-sm">Loading quotes...</p>}
        {quotesError && <p className="text-red-400 text-sm">{quotesError}</p>}
        {!quotesLoading && !quotesError && quotes.length === 0 && (
          <p className="text-gray-400 text-sm">No quotes for this property yet.</p>
        )}

        {!quotesLoading && !quotesError && quotes.length > 0 && (
          <div className="space-y-3">
            {quotes.map((q) => (
              <Link
                key={q.id}
                to={`/quotes/${q.id}`}
                className="block p-4 rounded-lg bg-black/30 border border-[#2a2a2a] hover:bg-black/50 transition"
              >
                <div className="flex justify-between items-center text-sm text-gray-200">
                  <div className="space-y-1">
                    <div className="font-semibold text-white">Quote {q.quoteNumber || q.id}</div>
                    <div className="text-gray-400">Status: {q.status}</div>
                  </div>
                  <div className="text-[#e8d487] font-semibold">${q.total?.toFixed(2) || "0.00"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
