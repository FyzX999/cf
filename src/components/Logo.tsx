import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer">
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold tracking-tight text-blue-500">CF</span>
      </div>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          cheapfollower.shop
        </span>
      )}
    </Link>
  );
}