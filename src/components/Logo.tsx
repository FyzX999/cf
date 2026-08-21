import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center cursor-pointer group">
      <span className="text-base font-bold tracking-tight">
        {compact ? "CF" : "cheapfollower.shop"}
      </span>
    </Link>
  );
}
