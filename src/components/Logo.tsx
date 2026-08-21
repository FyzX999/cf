import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer group">
      <span
        className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-sm font-bold text-blue-400 transition-all group-hover:border-white/20 group-hover:from-blue-500/30 group-hover:to-blue-600/20"
      >
        CF
      </span>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          cheapfollower.shop
        </span>
      )}
    </Link>
  );
}
