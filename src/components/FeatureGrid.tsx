"use client";

import { Lightning, ChartLineUp, ShieldCheck, DeviceMobile } from "@phosphor-icons/react";

const items = [
  { icon: Lightning, title: "Instant checkout", body: "Pick platform, service, quantity, and link. Price updates live." },
  { icon: ChartLineUp, title: "Live tracking", body: "Watch delivery progress without refreshing the page." },
  { icon: ShieldCheck, title: "Refill protection", body: "Eligible drops can be refilled automatically with a visible history." },
  { icon: DeviceMobile, title: "Built for mobile", body: "A 7-step order flow that stays fast on a phone." },
];

export function FeatureGrid() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
          <article key={item.title} className="glass lift p-5">
          <item.icon size={22} className="text-[#6ea8ff]" />
          <h2 className="mt-3 font-semibold">{item.title}</h2>
          <p className="muted mt-1 text-sm leading-6">{item.body}</p>
        </article>
      ))}
    </section>
  );
}
