"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Upload, Plus, Trash2, Check } from "lucide-react";
import { calcPrice } from "@/lib/catalog";

interface OrderRow {
  service_id: string;
  service_name: string;
  platform: string;
  quantity: number;
  link: string;
  delivery: "standard" | "fast" | "express";
  total: number;
}

export function BulkOrderBuilder() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  function addOrder() {
    setOrders([
      ...orders,
      {
        service_id: "",
        service_name: "",
        platform: "instagram",
        quantity: 1000,
        link: "",
        delivery: "standard",
        total: 0,
      },
    ]);
  }

  function removeOrder(index: number) {
    setOrders(orders.filter((_, i) => i !== index));
  }

  function updateOrder(index: number, field: keyof OrderRow, value: any) {
    const newOrders = [...orders];
    newOrders[index] = { ...newOrders[index], [field]: value };
    setOrders(newOrders);
  }

  async function submitBulkOrder() {
    if (!name) {
      setError("Please enter a bulk order name");
      return;
    }

    if (orders.length === 0) {
      setError("Please add at least one order");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bulk-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          orders,
          total_amount: totalAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => {
        setOrders([]);
        setName("");
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bulk orders");
    } finally {
      setLoading(false);
    }
  }

  function parseCSV(csv: string) {
    try {
      const lines = csv.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const parsedOrders = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i];
        });

        return {
          service_id: row.service_id || "",
          service_name: row.service_name || "",
          platform: row.platform || "instagram",
          quantity: parseInt(row.quantity) || 1000,
          link: row.link || "",
          delivery: row.delivery || "standard",
          total: parseFloat(row.total) || 0,
        };
      });

      setOrders(parsedOrders);
      setShowCSVUpload(false);
    } catch (err) {
      setError("Failed to parse CSV");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Bulk Order Builder</h1>
        <p className="text-white/60">Create multiple orders at once and save time</p>
      </motion.div>

      {/* Name Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-lg p-6"
      >
        <label className="block text-sm font-semibold text-white mb-2">
          Bulk Order Name
        </label>
        <motion.input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Instagram Campaign - September"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#3ddc97]/50"
          whileFocus={{ scale: 1.01 }}
        />
      </motion.div>

      {/* CSV Upload */}
      <AnimatePresence>
        {showCSVUpload && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg p-6"
          >
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import CSV
            </h3>
            <p className="text-white/60 text-sm mb-4">
              CSV format: service_id, service_name, platform, quantity, link, delivery, total
            </p>
            <textarea
              placeholder="Paste CSV content here..."
              className="w-full h-32 bg-black/50 border border-white/20 rounded p-3 text-white text-sm font-mono outline-none focus:border-blue-500/50"
              onPaste={(e) => {
                const csv = e.clipboardData.getData("text");
                parseCSV(csv);
              }}
            />
            <div className="flex gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCSVUpload(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orders List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Orders ({orders.length})
          </h2>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCSVUpload(!showCSVUpload)}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded hover:bg-blue-500/30 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addOrder}
              className="px-4 py-2 bg-[#3ddc97]/20 border border-[#3ddc97]/50 text-[#3ddc97] rounded hover:bg-[#3ddc97]/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Order
            </motion.button>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/50 text-center py-8"
            >
              No orders yet. Add an order or import CSV to get started.
            </motion.p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 max-h-96 overflow-y-auto"
            >
              {orders.map((order, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      value={order.link}
                      onChange={(e) =>
                        updateOrder(i, "link", e.target.value)
                      }
                      placeholder="Link (e.g., instagram.com/user)"
                      className="col-span-2 sm:col-span-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm outline-none focus:border-white/30"
                    />
                    <input
                      type="number"
                      value={order.quantity}
                      onChange={(e) =>
                        updateOrder(i, "quantity", parseInt(e.target.value))
                      }
                      placeholder="Qty"
                      className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm outline-none focus:border-white/30"
                    />
                    <select
                      value={order.delivery}
                      onChange={(e) =>
                        updateOrder(i, "delivery", e.target.value)
                      }
                      className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm outline-none focus:border-white/30"
                    >
                      <option value="standard">Standard</option>
                      <option value="fast">Fast</option>
                      <option value="express">Express</option>
                    </select>
                    <input
                      type="number"
                      value={order.total}
                      onChange={(e) =>
                        updateOrder(i, "total", parseFloat(e.target.value))
                      }
                      placeholder="Total"
                      className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm outline-none focus:border-white/30"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeOrder(i)}
                      className="flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <p className="text-white/40 text-xs">
                    ${order.total.toFixed(2)} • {order.quantity} units • {order.delivery}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Summary & Submit */}
      <AnimatePresence>
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-[#3ddc97]/10 to-[#3ddc97]/5 border border-[#3ddc97]/30 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm">Total Orders</p>
                <motion.p
                  className="text-3xl font-bold text-white"
                  key={orders.length}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {orders.length}
                </motion.p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Cost</p>
                <motion.p
                  className="text-3xl font-bold text-[#3ddc97]"
                  key={totalAmount}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  ${totalAmount.toFixed(2)}
                </motion.p>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Bulk orders created successfully!
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={submitBulkOrder}
              disabled={loading || orders.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-[#3ddc97]/30 to-[#3ddc97]/10 border border-[#3ddc97]/50 hover:from-[#3ddc97]/40 hover:to-[#3ddc97]/20 text-[#3ddc97] font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Create Bulk Order"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
