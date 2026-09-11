"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Copy, Check, TrendingUp } from "lucide-react";

interface Referral {
  id: string;
  referral_code: string;
  status: string;
  uses: number;
  created_at: string;
  commission_rate: number;
}

interface Commission {
  id: string;
  amount: number;
  status: "earned" | "paid" | "pending";
  created_at: string;
}

export function ReferralProgram() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [totals, setTotals] = useState({ earned: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load referral codes
      const codesRes = await fetch("/api/referrals?type=code");
      const codesData = await codesRes.json();
      setReferrals(codesData);

      // Load commissions
      const commissionsRes = await fetch("/api/referrals?type=commissions");
      const commissionsData = await commissionsRes.json();
      setCommissions(commissionsData.commissions);
      setTotals(commissionsData.totals);
    } catch (error) {
      console.error("Failed to load referral data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createReferral() {
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();
      setReferrals([...referrals, data]);
    } catch (error) {
      console.error("Failed to create referral:", error);
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(
      `${window.location.origin}?ref=${code}`
    );
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-white/60">Earn 10% commission on every referred customer's purchases</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: "Earned", value: totals.earned, color: "from-green-500/20 to-green-600/10", textColor: "text-green-400" },
          { label: "Pending", value: totals.pending, color: "from-yellow-500/20 to-yellow-600/10", textColor: "text-yellow-400" },
          { label: "Paid Out", value: totals.paid, color: "from-blue-500/20 to-blue-600/10", textColor: "text-blue-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`bg-gradient-to-br ${stat.color} border border-white/10 rounded-lg p-4`}
          >
            <p className="text-white/60 text-sm mb-1">{stat.label}</p>
            <motion.p
              className={`${stat.textColor} text-2xl font-bold`}
              key={stat.value}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              ${stat.value.toFixed(2)}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>

      {/* Referral Codes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#3ddc97]" />
            Your Referral Codes
          </h2>
          <motion.button
            onClick={createReferral}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-[#3ddc97]/20 border border-[#3ddc97]/50 text-[#3ddc97] rounded-lg hover:bg-[#3ddc97]/30 transition-all"
          >
            + Create Code
          </motion.button>
        </div>

        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-white/10 rounded animate-pulse" />
              ))}
            </motion.div>
          ) : referrals.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/50 text-center py-8"
            >
              No referral codes yet. Create one to start earning!
            </motion.p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {referrals.map((ref, i) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <code className="bg-black/50 px-3 py-1 rounded font-mono text-[#3ddc97]">
                        {ref.referral_code}
                      </code>
                      <span className="text-white/60 text-sm">{ref.uses} uses</span>
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      Earns 10% commission
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipboard(ref.referral_code)}
                    className="p-2 hover:bg-white/10 rounded transition-all"
                  >
                    {copied === ref.referral_code ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-white/60" />
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Commission History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-lg p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">Commission History</h2>

        <AnimatePresence mode="popLayout">
          {commissions.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/50 text-center py-8"
            >
              No commissions yet. Invite friends to start earning!
            </motion.p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2 max-h-96 overflow-y-auto"
            >
              {commissions.map((commission, i) => (
                <motion.div
                  key={commission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between bg-white/5 rounded p-3 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      ${commission.amount.toFixed(2)}
                    </p>
                    <p className="text-white/40 text-xs">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <motion.span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      commission.status === "earned"
                        ? "bg-blue-500/20 text-blue-400"
                        : commission.status === "paid"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {commission.status.charAt(0).toUpperCase() +
                      commission.status.slice(1)}
                  </motion.span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Share Section */}
      {referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#3ddc97]/10 to-[#3ddc97]/5 border border-[#3ddc97]/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-bold text-white mb-3">Share Your Code</h3>
          <p className="text-white/60 text-sm mb-4">
            Share your referral link to earn commissions whenever your friends make a purchase
          </p>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${referrals[0]?.referral_code}`}
              readOnly
              className="flex-1 bg-black/50 border border-white/20 rounded px-4 py-2 text-white/60 text-sm outline-none"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => copyToClipboard(referrals[0]?.referral_code)}
              className="px-4 py-2 bg-[#3ddc97]/30 hover:bg-[#3ddc97]/40 text-[#3ddc97] rounded font-semibold transition-all"
            >
              Copy Link
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
