"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackPage() {
  const [id, setId] = useState("CF482917");
  const router = useRouter();
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-semibold">Track order</h1>
      <p className="muted mt-2 text-sm">Enter an order number such as #CF482917.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/track/${id.replace("#", "").trim()}`);
        }}
      >
        <input className="field" value={id} onChange={(e) => setId(e.target.value)} />
        <button className="btn btn-primary w-full" type="submit">
          Track
        </button>
      </form>
    </div>
  );
}
