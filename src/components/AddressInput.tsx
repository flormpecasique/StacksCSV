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
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%" }} noValidate>
        <div style={{ position: "relative" }} className="group">

          {/* Focus glow */}
          <div
            className="absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
            style={{
              background:
                "linear-gradient(135deg, rgba(249,115,22,0.5) 0%, transparent 50%, rgba(249,115,22,0.3) 100%)",
            }}
          />

          {/* Input row */}
          <div style={{
            position:     "relative",
            display:      "flex",
            alignItems:   "center",
            borderRadius: "12px",
            overflow:     "hidden",
            background:   "var(--bg-700)",
            border:       "1px solid var(--border)",
            paddingLeft:  "14px",
          }}>
            {/* Wallet icon — always visible */}
            <svg
              width="17" height="17" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M16 12a1 1 0 0 0 0 2h4v-2h-4z" />
            </svg>

            {/*
              font-size 16px prevents iOS Safari from zooming on focus.
              flex:1 + minWidth:0 = fills space without overflowing.
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
              autoCapitalize="off"
              aria-label={t("addressLabel")}
              disabled={isLoading}
              style={{
                flex:          "1 1 0%",
                minWidth:      0,
                background:    "transparent",
                border:        "none",
                outline:       "none",
                paddingTop:    "14px",
                paddingBottom: "14px",
                paddingLeft:   "10px",
                paddingRight:  "6px",
                fontSize:      "16px", /* ≥16px = no iOS zoom */
                color:         "var(--text-primary)",
                fontFamily:    "var(--font-mono)",
              }}
            />

            {/* Export button */}
            <button
              type="submit"
              disabled={isLoading || !address.trim()}
              style={{
                flexShrink:   0,
                margin:       "6px",
                padding:      "9px 18px",
                borderRadius: "8px",
                fontSize:     "14px",
                fontWeight:   600,
                fontFamily:   "var(--font-display)",
                background:   isLoading
                  ? "var(--bg-600)"
                  : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color:        isLoading ? "var(--text-muted)" : "#fff",
                border:       "none",
                cursor:       isLoading || !address.trim() ? "not-allowed" : "pointer",
                opacity:      isLoading || !address.trim() ? 0.4 : 1,
                transition:   "opacity 0.2s",
                whiteSpace:   "nowrap",
              }}
            >
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg viewBox="0 0 24 24" fill="none"
                    style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="3" strokeDasharray="40 24" />
                  </svg>
                  {t("fetching")}
                </span>
              ) : (
                t("exportBtn")
              )}
            </button>
          </div>
        </div>

        {validationError && (
          <p className="animate-fade-in" role="alert"
            style={{ marginTop: "8px", fontSize: "12px", color: "#f87171", fontFamily: "var(--font-body)" }}>
            ⚠ {validationError}
          </p>
        )}
      </form>

      {/* Example + trust signal */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        alignItems: "center", justifyContent: "space-between", gap: "4px",
      }}>
        <p style={{
          fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "58%",
        }}>
          {t("addressExample")}
        </p>
        <p style={{
          display: "flex", alignItems: "center", gap: "4px",
          fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-body)", flexShrink: 0,
        }}>
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
