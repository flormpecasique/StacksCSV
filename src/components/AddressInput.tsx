"use client";

import { useState, FormEvent } from "react";
import { type Lang, useTranslations } from "@/lib/i18n";

interface AddressInputProps {
  onSubmit:  (address: string) => void;
  isLoading: boolean;
  lang:      Lang;
}

const STACKS_REGEX = /^S[MP][A-Z0-9]{28,48}$/;
const BNS_REGEX    = /^[a-zA-Z0-9_-]+\.[a-zA-Z]+$/;
function isValidInput(v: string) {
  return STACKS_REGEX.test(v) || BNS_REGEX.test(v);
}

export default function AddressInput({ onSubmit, isLoading, lang }: AddressInputProps) {
  const t = useTranslations(lang);
  const [address,         setAddress]         = useState("");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setValidationError(lang === "es"
        ? "Por favor ingresa una dirección Stacks o nombre BNS."
        : "Please enter a Stacks address or BNS name.");
      return;
    }
    if (!isValidInput(trimmed)) {
      setValidationError(lang === "es"
        ? "Ingresa una dirección SP… o un nombre BNS (ej. flor.btc)."
        : "Enter a Stacks address (SP…) or a BNS name (e.g. flor.btc).");
      return;
    }
    setValidationError("");
    onSubmit(trimmed);
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="w-full" noValidate>
        <div className="relative group">
          {/* Glow border */}
          <div
            className="absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
            style={{
              background: "linear-gradient(135deg, rgba(249,115,22,0.5) 0%, transparent 50%, rgba(249,115,22,0.3) 100%)",
            }}
          />

          {/*
            Key fix: `min-w-0` on the wrapper + `flex` with `overflow-hidden`
            prevents the input from pushing the button off-screen.
          */}
          <div
            className="relative flex items-center rounded-xl overflow-hidden"
            style={{ background: "var(--bg-700)", border: "1px solid var(--border)" }}
          >
            {/* Wallet icon — hidden on very small screens to save space */}
            <span className="hidden xs:flex pl-4 pr-2 shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--text-muted)" }}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M16 12a1 1 0 0 0 0 2h4v-2h-4z" />
              </svg>
            </span>
            {/* Also show icon on sm+ regardless */}
            <span className="flex sm:hidden pl-3 pr-1 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--text-muted)" }}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M16 12a1 1 0 0 0 0 2h4v-2h-4z" />
              </svg>
            </span>

            {/*
              `min-w-0` is critical: flex children default to min-width: auto
              which forces the container to grow. min-w-0 lets it shrink.
            */}
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (validationError) setValidationError("");
              }}
              placeholder="SP2J6ZY48... or flor.btc"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              aria-label={t("addressLabel")}
              className="flex-1 min-w-0 bg-transparent py-3.5 pr-1 text-sm focus:outline-none placeholder:text-zinc-600"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              disabled={isLoading}
            />

            {/* Button — shrink-0 keeps it from collapsing */}
            <button
              type="submit"
              disabled={isLoading || !address.trim()}
              className="shrink-0 m-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              style={{
                fontFamily: "var(--font-display)",
                background: isLoading ? "var(--bg-600)" : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: isLoading ? "var(--text-muted)" : "#fff",
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 24" />
                  </svg>
                  {/* Hide text on very small screens to save space */}
                  <span className="hidden sm:inline">{t("fetching")}</span>
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline">{t("exportBtn")}</span>
                  {/* Arrow-only on tiny screens */}
                  <span className="sm:hidden">→</span>
                </>
              )}
            </button>
          </div>
        </div>

        {validationError && (
          <p className="mt-2 text-xs animate-fade-in"
            style={{ color: "#f87171", fontFamily: "var(--font-body)" }} role="alert">
            ⚠ {validationError}
          </p>
        )}
      </form>

      {/* Example + trust signal — stack on mobile */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1">
        <p className="text-xs truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {t("addressExample")}
        </p>
        <p className="flex items-center gap-1 text-xs shrink-0"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t("noDataStored")}
        </p>
      </div>
    </div>
  );
}
