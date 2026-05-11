"use client";

import { useLocale } from "next-intl";

export default function LanguageSwitcher() {
  const locale = useLocale();

  const switchLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-1">
      <button
        onClick={() => switchLocale("en")}
        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
          locale === "en"
            ? "bg-primary text-white"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("tr")}
        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
          locale === "tr"
            ? "bg-primary text-white"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        TR
      </button>
    </div>
  );
}
