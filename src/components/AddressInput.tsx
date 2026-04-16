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

function isValidInput(value: string): boolean {
  return STACKS_REGEX.test(value) || BNS_REGEX.test(value);
}

export default function AddressInput({
  onSubmit,
  isLoading,
  lang,
}: AddressInputProps) {
  const t = useTranslations(lang);
  const [address, setAddress]               = useState("");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();

    if (!trimmed) {
      setValidationError(
        lang === "es"
          ? "Por favor ingresa una dirección Stacks o nombre BNS."
          : "Please enter a Stacks address or BNS name."
      );
      return;
    }
    if (!isValidInput(trimmed)) {
      setValidationError(
        lang === "es"
          ? "Ingresa una dirección Stacks (SP...) o un nombre BNS (ej. flor.btc)."
          : "Enter a Stacks address (SP...) or a BNS name (e.g. flor.btc)."
      );
      return;
    }

    setValidationError("");
    onSubmit(trimmed);
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)" }}
      >
        {t("addressLabel")}
      </p>

      <form onSubmit={handleSubmit} className="w-full" noValidate>
        <div className="relative group">
          {/* Glow border on focus */}
          <div
            className="absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
            style={{
              background:
                "linear-gradient(135deg, rgba(249,115,22,0.5) 0%, transparent 50%, rgba(249,115,22,0.3) 100%)",
            }}
          />

          <div
            className="relative flex items-center rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-700)",
              border:     "1px solid var(--border)",
            }}
          >
            {/* Wallet icon */}
            <span className="pl-4 pr-2 shrink-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--text-muted)" }}
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M16 12a1 1 0 0 0 0 2h4v-2h-4z" />
              </svg>
            </span>

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
              className="flex-1 bg-transparent py-4 pr-2 text-sm focus:outline-none placeholder:text-zinc-600"
              style={{
                color:      "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading || !address.trim()}
              className="m-1.5 shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: "var(--font-display)",
                background: isLoading
                  ? "var(--bg-600)"
                  : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: isLoading ? "var(--text-muted)" : "#fff",
              }}
              aria-label="Export transactions"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="40 24"
                    />
                  </svg>
                  {lang === "es" ? "Obteniendo…" : "Fetching…"}
                </span>
              ) : (
                "Export →"
              )}
            </button>
          </div>
        </div>

        {validationError && (
          <p
            className="mt-2 text-xs animate-fade-in"
            style={{ color: "#f87171", fontFamily: "var(--font-body)" }}
            role="alert"
          >
            ⚠ {validationError}
          </p>
        )}
      </form>

      <p
        className="text-xs"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
      >
        {t("addressHint")}{" "}
        <span
          style={{ color: "var(--brand)", fontFamily: "var(--font-mono)" }}
        >
          flor.btc
        </span>
      </p>
    </div>
  );
}
