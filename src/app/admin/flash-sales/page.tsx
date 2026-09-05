"use client";

import { AdminShell } from "@/components/AdminShell";
import { type FlashSale } from "@/lib/flash-sales";
import { useEffect, useState } from "react";
import { CountdownTimer } from "@/components/marketing/CountdownTimer";

export default function AdminFlashSalesPage() {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: "",
    discount: 10,
    startTime: "",
    endTime: "",
    serviceIds: [] as string[],
  });

  async function load() {
    const [salesRes, catalogRes] = await Promise.all([
      fetch("/api/admin/flash-sales", { cache: "no-store" }),
      fetch("/api/catalog", { cache: "no-store" })
    ]);
    
    const salesJson = await salesRes.json();
    const catalogJson = await catalogRes.json();
    
    if (!salesRes.ok) throw new Error(salesJson.error || "Failed to load flash sales");
    
    setFlashSales(salesJson.flashSales ?? []);
    
    // Flatten catalog to get all services
    const allServices: any[] = [];
    if (catalogJson.platforms) {
      catalogJson.platforms.forEach((platform: any) => {
        platform.categories?.forEach((category: any) => {
          category.services?.forEach((service: any) => {
            allServices.push({
              id: service.id,
              name: service.name,
              platform: platform.name,
              category: category.name
            });
          });
        });
      });
    }
    setServices(allServices);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setNote(null);
    
    try {
      if (form.serviceIds.length === 0) {
        throw new Error("Please select at least one service");
      }
      
      const url = editing ? `/api/admin/flash-sales/${editing}` : "/api/admin/flash-sales";
      const method = editing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      
      setNote(editing ? "Flash sale updated" : "Flash sale created");
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this flash sale?")) return;
    
    setBusy(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/admin/flash-sales/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete");
      }
      
      setNote("Flash sale deleted");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(sale: FlashSale) {
    setEditing(sale.id);
    setForm({
      title: sale.title,
      discount: sale.discount,
      startTime: sale.startTime,
      endTime: sale.endTime,
      serviceIds: sale.serviceIds,
    });
  }

  function resetForm() {
    setEditing(null);
    setForm({
      title: "",
      discount: 10,
      startTime: "",
      endTime: "",
      serviceIds: [],
    });
  }

  function toggleService(serviceId: string) {
    setForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId]
    }));
  }

  function getStatusBadge(sale: FlashSale) {
    const colors = {
      scheduled: "bg-blue-500/20 text-blue-400",
      active: "bg-green-500/20 text-green-400",
      expired: "bg-gray-500/20 text-gray-400"
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[sale.status]}`}>
        {sale.status}
      </span>
    );
  }

  return (
    <AdminShell title="Flash Sales">
      {error && <p className="mb-4 text-sm text-[#f07167]">{error}</p>}
      {note && <p className="mb-4 text-sm text-[#3ddc97]">{note}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create/Edit Form */}
        <div className="glass space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{editing ? "Edit flash sale" : "New flash sale"}</p>
            {editing && (
              <button 
                type="button" 
                className="text-xs text-[#9aa3b5] hover:text-white"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
          
          <input
            className="field"
            placeholder="Title (e.g., Weekend Flash Sale)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          
          <div>
            <label className="mb-1 block text-xs text-[#9aa3b5]">Discount %</label>
            <input
              className="field"
              type="number"
              min={1}
              max={99}
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Start time</label>
              <input
                className="field"
                type="datetime-local"
                value={form.startTime ? new Date(form.startTime).toISOString().slice(0, 16) : ""}
                onChange={(e) => setForm({ ...form, startTime: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">End time</label>
              <input
                className="field"
                type="datetime-local"
                value={form.endTime ? new Date(form.endTime).toISOString().slice(0, 16) : ""}
                onChange={(e) => setForm({ ...form, endTime: new Date(e.target.value).toISOString() })}
              />
            </div>
          </div>
          
          <div>
            <label className="mb-2 block text-xs text-[#9aa3b5]">
              Services ({form.serviceIds.length} selected)
            </label>
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-white/8 bg-[#0a0b0f] p-3">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={form.serviceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
                  />
                  <span className="flex-1">
                    {service.name}
                    <span className="ml-2 text-xs text-[#9aa3b5]">
                      {service.platform} • {service.category}
                    </span>
                  </span>
                </label>
              ))}
              {!services.length && (
                <p className="text-center text-sm text-[#9aa3b5]">Loading services...</p>
              )}
            </div>
          </div>
          
          <button 
            type="button" 
            className="btn btn-primary w-full" 
            disabled={busy || !form.title.trim() || form.serviceIds.length === 0}
            onClick={handleSubmit}
          >
            {editing ? "Update flash sale" : "Create flash sale"}
          </button>
        </div>

        {/* List of Flash Sales */}
        <div className="glass space-y-3 p-5">
          <p className="font-semibold">Active & Scheduled Sales</p>
          
          <div className="space-y-3">
            {flashSales
              .filter(sale => sale.status !== 'expired')
              .map((sale) => (
                <div key={sale.id} className="rounded-lg border border-white/8 bg-[#0a0b0f] p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{sale.title}</h4>
                        {getStatusBadge(sale)}
                      </div>
                      <p className="mt-1 text-2xl font-bold text-orange-400">
                        {sale.discount}% OFF
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="text-xs text-blue-400 hover:text-blue-300"
                        onClick={() => handleEdit(sale)}
                      >
                        Edit
                      </button>
                      <span className="text-white/20">•</span>
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(sale.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {sale.status === 'active' && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs text-[#9aa3b5]">Ends in</p>
                      <CountdownTimer endTime={sale.endTime} variant="compact" />
                    </div>
                  )}
                  
                  {sale.status === 'scheduled' && (
                    <p className="mb-3 text-xs text-[#9aa3b5]">
                      Starts: {new Date(sale.startTime).toLocaleString()}
                    </p>
                  )}
                  
                  <p className="text-xs text-[#9aa3b5]">
                    {sale.serviceIds.length} service{sale.serviceIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            
            {flashSales.filter(sale => sale.status !== 'expired').length === 0 && (
              <p className="text-center text-sm text-[#9aa3b5] py-8">
                No active or scheduled flash sales
              </p>
            )}
          </div>
          
          {flashSales.filter(sale => sale.status === 'expired').length > 0 && (
            <>
              <p className="pt-4 font-semibold text-sm text-[#9aa3b5]">Expired Sales</p>
              <div className="space-y-2">
                {flashSales
                  .filter(sale => sale.status === 'expired')
                  .slice(0, 3)
                  .map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between border-t border-white/5 py-2 text-sm opacity-50">
                      <span>{sale.title}</span>
                      <span className="text-xs text-[#9aa3b5]">
                        {sale.discount}% • Ended {new Date(sale.endTime).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}