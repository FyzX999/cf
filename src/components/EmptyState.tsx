interface EmptyStateProps {
  type: "tickets" | "transactions" | "refunds" | "orders";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ type, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="glass p-12 text-center">
      <div className="mx-auto mb-6 w-48">
        {type === "tickets" && <TicketsIllustration />}
        {type === "transactions" && <TransactionsIllustration />}
        {type === "refunds" && <RefundsIllustration />}
        {type === "orders" && <OrdersIllustration />}
      </div>
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-[#9aa3b5] text-sm mb-6 max-w-md mx-auto">{description}</p>
      
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// SVG Illustrations using application's color palette
function TicketsIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Document with ticket stub */}
      <rect x="50" y="30" width="100" height="140" rx="8" fill="rgba(110, 168, 255, 0.1)" stroke="#6ea8ff" strokeWidth="2" />
      
      {/* Ticket perforation line */}
      <line x1="50" y1="110" x2="150" y2="110" stroke="#6ea8ff" strokeWidth="2" strokeDasharray="4 4" />
      
      {/* Small circles along perforation */}
      <circle cx="45" cy="110" r="4" fill="#6ea8ff" />
      <circle cx="155" cy="110" r="4" fill="#6ea8ff" />
      
      {/* Text lines on ticket */}
      <line x1="70" y1="60" x2="130" y2="60" stroke="#9aa3b5" strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="75" x2="110" y2="75" stroke="#9aa3b5" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="85" x2="125" y2="85" stroke="#9aa3b5" strokeWidth="2" strokeLinecap="round" />
      
      {/* Stub section */}
      <rect x="65" y="125" width="70" height="8" rx="2" fill="#8b7dff" opacity="0.3" />
      <rect x="65" y="140" width="50" height="6" rx="2" fill="#8b7dff" opacity="0.2" />
      
      {/* Add icon/badge */}
      <circle cx="100" cy="50" r="12" fill="#3ddc97" opacity="0.2" />
      <path d="M96 50l3 3 6-6" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function TransactionsIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Wallet/Card */}
      <rect x="40" y="70" width="120" height="80" rx="12" fill="rgba(110, 168, 255, 0.1)" stroke="#6ea8ff" strokeWidth="2" />
      
      {/* Card chip */}
      <rect x="55" y="85" width="30" height="24" rx="4" fill="#f5b942" opacity="0.3" stroke="#f5b942" strokeWidth="1.5" />
      <line x1="60" y1="92" x2="80" y2="92" stroke="#f5b942" strokeWidth="1" />
      <line x1="60" y1="97" x2="80" y2="97" stroke="#f5b942" strokeWidth="1" />
      <line x1="60" y1="102" x2="80" y2="102" stroke="#f5b942" strokeWidth="1" />
      
      {/* Card number lines */}
      <line x1="55" y1="125" x2="75" y2="125" stroke="#9aa3b5" strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="125" x2="102" y2="125" stroke="#9aa3b5" strokeWidth="2" strokeLinecap="round" />
      <line x1="109" y1="125" x2="129" y2="125" stroke="#9aa3b5" strokeWidth="2" strokeLinecap="round" />
      <line x1="136" y1="125" x2="145" y2="125" stroke="#9aa3b5" strokeWidth="2" strokeLinecap="round" />
      
      {/* Transaction arrows */}
      <g opacity="0.6">
        <circle cx="100" cy="40" r="16" fill="rgba(61, 220, 151, 0.15)" stroke="#3ddc97" strokeWidth="2" />
        <path d="M100 34v12M106 40l-6-6-6 6" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      
      <g opacity="0.6">
        <circle cx="100" cy="170" r="16" fill="rgba(240, 113, 103, 0.15)" stroke="#f07167" strokeWidth="2" />
        <path d="M100 176v-12M94 170l6 6 6-6" stroke="#f07167" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

function RefundsIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Circular arrow representing refund cycle */}
      <circle cx="100" cy="100" r="50" stroke="#6ea8ff" strokeWidth="3" strokeDasharray="8 6" opacity="0.3" />
      
      {/* Money symbol in center */}
      <circle cx="100" cy="100" r="35" fill="rgba(110, 168, 255, 0.1)" stroke="#6ea8ff" strokeWidth="2" />
      
      {/* Dollar sign */}
      <path d="M100 85v30M95 90h10c2.5 0 5 2 5 5s-2.5 5-5 5h-10M95 100h10c2.5 0 5 2 5 5s-2.5 5-5 5h-10" 
        stroke="#6ea8ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      
      {/* Curved return arrow */}
      <path d="M145 80 Q155 70 160 75 T155 90" 
        stroke="#3ddc97" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M160 75 L153 72 L155 80" fill="#3ddc97" />
      
      {/* Decorative coins */}
      <g opacity="0.4">
        <circle cx="50" cy="60" r="8" fill="#f5b942" />
        <line x1="50" y1="56" x2="50" y2="64" stroke="#07080c" strokeWidth="1.5" />
      </g>
      
      <g opacity="0.4">
        <circle cx="150" cy="140" r="8" fill="#f5b942" />
        <line x1="150" y1="136" x2="150" y2="144" stroke="#07080c" strokeWidth="1.5" />
      </g>
      
      {/* Checkmark badge */}
      <circle cx="135" cy="65" r="12" fill="#3ddc97" />
      <path d="M131 65l3 3 6-6" stroke="#07080c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function OrdersIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Shopping bag */}
      <path d="M60 80 L50 170 Q50 180 60 180 L140 180 Q150 180 150 170 L140 80 Z" 
        fill="rgba(110, 168, 255, 0.1)" stroke="#6ea8ff" strokeWidth="2" />
      
      {/* Bag handles */}
      <path d="M70 80 Q70 60 100 60 Q130 60 130 80" 
        stroke="#6ea8ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Items in bag - represented by abstract shapes */}
      <rect x="70" y="100" width="60" height="8" rx="2" fill="#8b7dff" opacity="0.5" />
      <rect x="75" y="115" width="50" height="8" rx="2" fill="#8b7dff" opacity="0.4" />
      <rect x="80" y="130" width="40" height="8" rx="2" fill="#8b7dff" opacity="0.3" />
      
      {/* Social media icons on bag (representing followers/likes) */}
      <g opacity="0.6">
        {/* Heart icon */}
        <path d="M90 150 C90 145 95 142 98 145 C101 142 106 145 106 150 C106 155 98 160 98 160 C98 160 90 155 90 150" 
          fill="#f07167" />
      </g>
      
      <g opacity="0.6">
        {/* Star icon */}
        <path d="M115 152 L117 158 L123 158 L118 162 L120 168 L115 164 L110 168 L112 162 L107 158 L113 158 Z" 
          fill="#f5b942" />
      </g>
      
      {/* Plus badge for new order */}
      <circle cx="145" cy="70" r="14" fill="#3ddc97" />
      <path d="M145 64v12M139 70h12" stroke="#07080c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
