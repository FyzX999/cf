import Link from "next/link";
import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 cursor-pointer group">
      <div className="relative h-10 w-10 flex items-center justify-center">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Image
          src="/images/rocket-icon.png"
          alt="CheapFollower"
          width={32}
          height={32}
          className="relative z-10 transition-transform group-hover:scale-110"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))',
            mixBlendMode: 'lighten'
          }}
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
