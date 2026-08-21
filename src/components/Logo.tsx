import Link from "next/link";
import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer group">
      <div className="relative h-10 w-10 rounded-lg transition-transform group-hover:scale-110">
        <Image
          src="/images/rocket-icon.png"
          alt="CheapFollower"
          fill
          className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          style={{ mixBlendMode: 'screen' }}
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
