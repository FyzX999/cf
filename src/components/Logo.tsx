import Link from "next/link";
import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer">
      <div className="relative h-8 w-8">
        <Image
          src="/images/rocket-icon.png"
          alt="CheapFollower"
          fill
          className="object-contain"
        />
      </div>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          cheapfollower.shop
        </span>
      )}
    </Link>
  );
}
