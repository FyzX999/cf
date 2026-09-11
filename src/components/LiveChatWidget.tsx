"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp?: any[];
    CRISP_WEBSITE_ID?: string;
  }
}

export function LiveChatWidget() {
  useEffect(() => {
    // Initialize Crisp chat widget
    const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

    if (!CRISP_WEBSITE_ID) {
      console.warn("CRISP_WEBSITE_ID not configured");
      return;
    }

    // Load Crisp script
    if (typeof window !== "undefined") {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const scriptElement = document.querySelector(
          'script[src="https://client.crisp.chat/l.js"]'
        );
        if (scriptElement) {
          scriptElement.remove();
        }
      };
    }
  }, []);

  return null;
}

export function SimpleLiveChat() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3ddc97] to-[#3ddc97]/50 rounded-full blur group-hover:blur-md transition-all opacity-75 group-hover:opacity-100" />
        <div className="relative h-14 w-14 rounded-full bg-[#07080c] border border-[#3ddc97]/30 flex items-center justify-center cursor-pointer hover:border-[#3ddc97]/50 transition-all">
          <svg
            className="w-6 h-6 text-[#3ddc97]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4l-4 4v-4H2V5z" />
          </svg>
        </div>
      </button>

      <div className="absolute bottom-16 right-0 bg-white/95 text-gray-900 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Live Chat Support
      </div>
    </div>
  );
}
