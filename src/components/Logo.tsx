import Link from "next/link";
import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer group">
      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-400/10 p-1.5 transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/25">
        <div className="relative h-full w-full">
          <Image
            src="/images/rocket-icon.png"
            alt="CheapFollower"
            fill
            className="object-contain brightness-0 invert"
            style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))' }}
          />
        </div>
      </div>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          cheapfollower.shop
        </span>
      )}
    </Link>
  );
}
