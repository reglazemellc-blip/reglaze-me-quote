// -------------------------------------------------------------
// ServiceForm.tsx — Create + Edit Service
// -------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useServicesStore, Service } from "@store/useServicesStore";

export default function ServiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const { getById, upsert } = useServicesStore();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // --------------------
  // FORM STATE
  // --------------------
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [category, setCategory] = useState("");
  const [taxable, setTaxable] = useState(false);
  const [warning, setWarning] = useState("");

  // --------------------
  // LOAD EXISTING SERVICE (edit mode)
  // --------------------
  useEffect(() => {
    const load = async () => {
      if (!isEdit || !id) return;

      const svc = await getById(id);
      if (!svc) {
        alert("Service not found.");
        navigate("/services");
        return;
      }

      setName(svc.name);
      setDescription(svc.description ?? "");
      setUnitPrice(Number(svc.unitPrice ?? 0));
      setCategory(svc.category ?? "");
      setTaxable(Boolean(svc.taxable));
      setWarning(svc.warning ?? "");

      setLoading(false);
    };

    load();
  }, [isEdit, id, getById, navigate]);

  // --------------------
  // SAVE HANDLER
  // --------------------
  const handleSave = async () => {
    if (!name.trim()) {
      alert("Service name is required.");
      return;
    }

    setSaving(true);

    const payload: Partial<Service> = {
      id,
      name: name.trim(),
      description: description.trim(),
      warning: warning.trim(),
      unitPrice: Number(unitPrice),
      category: category.trim() || null,
      taxable,
    };

    await upsert(payload);

    alert(isEdit ? "Service updated." : "Service created.");
    navigate("/services");
  };

  if (loading)
    return <div className="p-6 text-gray-400">Loading service…</div>;

  // --------------------
  // RENDER FORM
  // --------------------
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 text-[#f5f3da]">
      <h1 className="text-2xl font-semibold text-[#e8d487]">
        {isEdit ? "Edit Service" : "New Service"}
      </h1>

      <div className="card p-4 space-y-4">
        {/* NAME */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Name</label>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Patch chip in tub"
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Description</label>
          <textarea
            className="input w-full h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this service include?"
          />
        </div>

        {/* PRICE */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Unit Price</label>
          <input
            type="number"
            className="input w-32"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
          />
        </div>

        {/* CATEGORY */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Category (optional)
          </label>
          <input
            className="input w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Bathroom, Kitchen, Repairs..."
          />
        </div>

        {/* TAXABLE */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={taxable}
            onChange={(e) => setTaxable(e.target.checked)}
          />
          <span className="text-sm text-gray-300">Taxable service?</span>
        </div>

        {/* WARNING */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Warning (optional)
          </label>
          <textarea
            className="input w-full h-20"
            value={warning}
            onChange={(e) => setWarning(e.target.value)}
            placeholder="Any warnings or special notes for this service?"
          />
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-3">
        <button
          className="btn-outline-gold px-4"
          onClick={() => navigate("/services")}
        >
          Cancel
        </button>

        <button
          className="btn-gold px-6"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : isEdit ? "Save Service" : "Create Service"}
        </button>
      </div>
    </div>
  );
}