"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const locales = [
    { code: "en", flag: "🇬🇧", label: t("english") },
    { code: "tr", flag: "🇹🇷", label: t("turkish") },
  ];

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  const switchLocale = (newLocale: string) => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = "LOCALE_PREFERENCE=1;path=/;max-age=31536000;SameSite=Lax";
    window.location.reload();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-base"
      >
        {current.flag}
        <span className="text-zinc-400 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-32 rounded-lg bg-zinc-900 border border-white/10 shadow-lg overflow-hidden z-50">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                locale === l.code ? "text-white font-medium" : "text-zinc-400"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
