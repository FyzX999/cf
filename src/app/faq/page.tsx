import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — Cheap Instagram Followers, TikTok Views & SMM Help",
  description:
    "Answers about buying cheap Instagram followers, TikTok views, YouTube subscribers, delivery speed, refill protection, guest checkout, payments, and reseller API on cheapfollower.shop.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ | cheapfollower.shop",
    description: "How cheap SMM orders work: delivery, refills, accounts, payments, and tracking.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const groups = [
  {
    heading: "Ordering cheap social media services",
    items: [
      {
        q: "Can I buy Instagram followers, TikTok views, or YouTube subscribers without an account?",
        a: "Yes. Guest checkout on cheapfollower.shop lets you pay and start delivery from the homepage order widget. Create a free account if you want a saved order history, wallet, refills, and API access.",
      },
      {
        q: "How cheap are Instagram followers and other SMM services?",
        a: "Prices are listed per 1,000 units on each service page and on the pricing table. The checkout total updates live with quantity and delivery speed (standard, fast, or drip-feed). There are no hidden add-on fees in the catalog price.",
      },
      {
        q: "How fast does delivery start after I place an order?",
        a: "Most Instagram, TikTok, YouTube, and other platform services start within minutes. Instant-tagged services typically begin in 0–5 minutes; others start in about 5–30 minutes. The exact window is shown on the service page before you pay.",
      },
      {
        q: "What link do I enter when I buy followers or views?",
        a: "Use a public profile, post, reel, video, or channel URL. Private, banned, or brand-new accounts can delay or stop delivery. We never ask for your social media password.",
      },
    ],
  },
  {
    heading: "Delivery, refills, and tracking",
    items: [
      {
        q: "Can counts drop after delivery?",
        a: "Yes. Followers, likes, views, and other units can drop over time because of platform cleanup, fake or inactive accounts, privacy changes, or the target going private. cheapfollower.shop is not liable for drops, platform removals, or account penalties. Refill (when offered on a service) is the only optional recovery path during that service's refill window, and it is not a guarantee, refund, or warranty.",
      },
      {
        q: "How do I track my SMM order?",
        a: "After checkout you get an order ID such as CF123456. Open Track Order, paste the ID, and watch delivered quantity and status update. Signed-in customers also see every past order under My Orders.",
      },
      {
        q: "What is refill protection on cheapfollower.shop?",
        a: "For services marked with refill, if the live count drops below the purchased quantity during the refill window (often 30 days), you can request a refill from the order page. Refill history is stored with the original order.",
      },
      {
        q: "Can I cancel or get a partial refund?",
        a: "Cancellation is available only before the provider starts delivery. After delivery starts, payments are treated as final for a completed digital service. Drops after delivery are not refundable. If an order completes as partial, you are charged for delivered units and the remainder may be reversed according to the order status.",
      },
    ],
  },
  {
    heading: "Accounts, payments, and resellers",
    items: [
      {
        q: "Which payments can I use to buy cheap followers?",
        a: "Cryptocurrency (BTC, ETH, USDT, and other coins via the crypto checkout). Wallet balance and gift cards also work. After a confirmed crypto transfer, the order is auto-confirmed and delivery starts without manual review. Crypto payments are irreversible.",
      },
      {
        q: "Are payments refundable if followers drop?",
        a: "No. Services are sold as-is. Platforms can remove activity at any time. We are not liable for drops, bans, or lost counts. Crypto cannot be reversed. Use refill on eligible services instead of a payment dispute.",
      },
      {
        q: "Do you ever ask for Instagram or TikTok passwords?",
        a: "No. Orders use public URLs only. If a rare service required a password it would be labeled on the service page. Nothing in the current catalog asks for login credentials.",
      },
      {
        q: "How does the reseller API work?",
        a: "Resellers get wholesale rates, custom retail markups, and the same PerfectPanel-compatible v2 API used by panels: services, add, status, refill, and cancel. See the developers page for action names and the dashboard API tab for your key.",
      },
    ],
  },
];

export default function FaqPage() {
  const all = groups.flatMap((g) => g.items);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.16em] text-[#9aa3b5]">Help center</p>
      <h1 className="mt-2 text-3xl font-semibold">Frequently asked questions</h1>
      <p className="muted mt-3 text-sm leading-6">
        Learn how to buy cheap Instagram followers, TikTok views, YouTube subscribers, and other social media marketing services — including delivery speed, refill protection, tracking, and reseller API access.
      </p>
      <p className="muted mt-2 text-sm">
        Browse the <Link className="text-[#6ea8ff]" href="/services">live catalog</Link> or compare{" "}
        <Link className="text-[#6ea8ff]" href="/pricing">per-1K pricing</Link>.
      </p>
      <div className="mt-10 space-y-10">
        {groups.map((group, gi) => (
          <section key={group.heading} className="reveal is-static">
            <h2 className="text-lg font-semibold">{group.heading}</h2>
            <div className="mt-4 space-y-3">
              {group.items.map((item, ii) => (
                <details key={item.q} className="faq-item glass p-5" style={{ animationDelay: `${(gi * 4 + ii) * 40}ms` }}>
                  <summary className="cursor-pointer font-medium">{item.q}</summary>
                  <p className="muted mt-3 text-sm leading-6">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
