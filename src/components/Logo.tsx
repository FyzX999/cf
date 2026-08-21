import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-[#6ea8ff]"
      >
        cf
      </span>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          cheapfollower.shop
        </span>
      )}
    </Link>
  );
}
