"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { useState, useEffect } from "react";
import { money } from "@/lib/format";
import type { Affiliate, AffiliateStats, AffiliatePayout } from "@/lib/types";
import Link from "next/link";

export default function AffiliatePage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      
      // Check if user is already an affiliate
      const affiliateRes = await fetch("/api/affiliate/signup");
      
      if (affiliateRes.ok) {
        const affiliateData = await affiliateRes.json();
        setAffiliate(affiliateData.affiliate);
        setIsAffiliate(true);

        // Load stats
        const statsRes = await fetch("/api/affiliate/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }

        // Load payout history
        const payoutsRes = await fetch("/api/affiliate/payout");
        if (payoutsRes.ok) {
          const payoutsData = await payoutsRes.json();
          setPayouts(payoutsData.payouts);
        }
      } else if (affiliateRes.status === 404) {
        setIsAffiliate(false);
      }
    } catch (e) {
      console.error("Failed to load affiliate data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function joinAffiliate() {
    try {
      setError("");
      const res = await fetch("/api/affiliate/signup", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setAffiliate(data.affiliate);
        setIsAffiliate(true);
        setMessage("Welcome to the affiliate program!");
        loadData();
      } else {
        setError(data.error || "Failed to join affiliate program");
      }
    } catch (e) {
      setError("Failed to join affiliate program");
    }
  }

  async function requestPayout() {
    try {
      setError("");
      setMessage("");

      const amount = parseFloat(payoutAmount);
      if (!amount || amount <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      if (amount < 10) {
        setError("Minimum payout amount is $10.00");
        return;
      }

      const res = await fetch("/api/affiliate/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: "wallet",
          paymentDetails: undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Wallet credit requested successfully! Funds will be added to your wallet once approved.");
        setPayoutAmount("");
        loadData();
      } else {
        setError(data.error || "Failed to request payout");
      }
    } catch (e) {
      setError("Failed to request payout");
    }
  }

  const referralLink = affiliate
    ? `${window.location.origin}?ref=${affiliate.referralCode}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setMessage("Referral link copied to clipboard!");
    setTimeout(() => setMessage(""), 3000);
  };

  if (isLoading) {
    return (
      <DashboardShell title="Affiliate Program">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6ea8ff] border-r-transparent" />
          <p className="mt-4 text-[#9aa3b5]">Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!isAffiliate) {
    return (
      <DashboardShell title="Affiliate Program">
        <div className="glass max-w-2xl p-8">
          <h2 className="text-2xl font-semibold">Join Our Affiliate Program</h2>
          <p className="mt-4 text-[#c5cddc]">
            Earn commissions by referring new customers to cheapfollower.shop. Get up to 10% commission on all
            orders placed by your referrals.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white/5 p-4">
              <h3 className="font-semibold">5% Commission</h3>
              <p className="muted mt-1 text-sm">Bronze tier (0+ referrals)</p>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <h3 className="font-semibold">7% Commission</h3>
              <p className="muted mt-1 text-sm">Silver tier (10+ referrals)</p>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <h3 className="font-semibold">8% Commission</h3>
              <p className="muted mt-1 text-sm">Gold tier (50+ referrals)</p>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <h3 className="font-semibold">10% Commission</h3>
              <p className="muted mt-1 text-sm">Platinum tier (100+ referrals)</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold">Benefits:</h3>
            <ul className="mt-2 space-y-2 text-[#c5cddc]">
              <li className="flex items-start gap-2">
                <span className="text-[#3ddc97]">✓</span>
                <span>Lifetime commissions on all referral orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3ddc97]">✓</span>
                <span>30-day cookie duration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3ddc97]">✓</span>
                <span>Real-time tracking dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3ddc97]">✓</span>
                <span>Multiple payout options (Wallet, PayPal, Crypto)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3ddc97]">✓</span>
                <span>Automatic tier upgrades as you grow</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3 text-sm text-[#f07167]">
              {error}
            </div>
          )}

          <button onClick={joinAffiliate} className="btn btn-primary mt-8">
            Join Affiliate Program
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Affiliate Dashboard">
      {message && (
        <div className="mb-4 rounded-lg bg-[#3ddc97]/10 border border-[#3ddc97]/20 p-3 text-sm text-[#3ddc97]">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3 text-sm text-[#f07167]">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass p-5">
          <p className="text-sm text-[#9aa3b5]">Total Earnings</p>
          <p className="mt-2 text-2xl font-semibold">{money(affiliate?.totalEarnings || 0)}</p>
        </div>
        <div className="glass p-5">
          <p className="text-sm text-[#9aa3b5]">Pending</p>
          <p className="mt-2 text-2xl font-semibold">{money(affiliate?.pendingEarnings || 0)}</p>
        </div>
        <div className="glass p-5">
          <p className="text-sm text-[#9aa3b5]">Total Referrals</p>
          <p className="mt-2 text-2xl font-semibold">{affiliate?.totalReferrals || 0}</p>
        </div>
        <div className="glass p-5">
          <p className="text-sm text-[#9aa3b5]">Commission Rate</p>
          <p className="mt-2 text-2xl font-semibold">
            {affiliate?.commissionRate || 0}%
            <span className="ml-2 text-sm font-normal text-[#9aa3b5] capitalize">({affiliate?.tier})</span>
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="glass mt-6 p-6">
        <h3 className="font-semibold">Your Referral Link</h3>
        <p className="muted mt-1 text-sm">Share this link to earn commissions</p>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            className="field flex-1"
            value={referralLink}
            readOnly
          />
          <button onClick={copyReferralLink} className="btn btn-primary">
            Copy
          </button>
        </div>
        <p className="muted mt-2 text-xs">Referral Code: <span className="font-mono text-white">{affiliate?.referralCode}</span></p>
      </div>

      {/* Monthly Stats */}
      {stats && (
        <div className="glass mt-6 p-6">
          <h3 className="font-semibold">Monthly Performance</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-[#9aa3b5]">This Month</p>
              <p className="mt-1 text-xl font-semibold">{money(stats.thisMonthEarnings)}</p>
            </div>
            <div>
              <p className="text-sm text-[#9aa3b5]">Last Month</p>
              <p className="mt-1 text-xl font-semibold">{money(stats.lastMonthEarnings)}</p>
            </div>
            <div>
              <p className="text-sm text-[#9aa3b5]">Total Commissions</p>
              <p className="mt-1 text-xl font-semibold">{stats.totalCommissions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Request Payout */}
      <div className="glass mt-6 p-6">
        <h3 className="font-semibold">Cash Out to Wallet Credit</h3>
        <p className="muted mt-1 text-sm">Minimum payout: $10.00 • Receive as onsite wallet credit</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            type="number"
            className="field"
            placeholder="Amount"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            min="10"
            step="0.01"
          />
          <button onClick={requestPayout} className="btn btn-primary">
            Request Wallet Credit
          </button>
        </div>
        <p className="muted mt-2 text-xs">
          Funds will be added to your account wallet and can be used for orders
        </p>
      </div>

      {/* Payout History */}
      {payouts.length > 0 && (
        <div className="glass mt-6 p-6">
          <h3 className="font-semibold">Payout History</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#9aa3b5]">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-t border-white/8">
                    <td className="py-3">{new Date(payout.requestedAt).toLocaleDateString()}</td>
                    <td className="py-3">{money(payout.amount)}</td>
                    <td className="py-3 capitalize">{payout.method}</td>
                    <td className="py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        payout.status === "completed" ? "bg-[#3ddc97]/10 text-[#3ddc97]" :
                        payout.status === "processing" ? "bg-[#6ea8ff]/10 text-[#6ea8ff]" :
                        payout.status === "failed" ? "bg-[#f07167]/10 text-[#f07167]" :
                        "bg-[#f5b942]/10 text-[#f5b942]"
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Referrals */}
      {stats && stats.topReferrals.length > 0 && (
        <div className="glass mt-6 p-6">
          <h3 className="font-semibold">Top Referrals</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#9aa3b5]">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Total Spent</th>
                  <th className="pb-3">Your Commission</th>
                </tr>
              </thead>
              <tbody>
                {stats.topReferrals.map((ref) => (
                  <tr key={ref.userId} className="border-t border-white/8">
                    <td className="py-3">{ref.email}</td>
                    <td className="py-3">{money(ref.totalSpent)}</td>
                    <td className="py-3 text-[#3ddc97]">{money(ref.commissionEarned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
