"use client";

import { useState, FormEvent } from "react";

interface AddressInputProps {
  onSubmit: (address: string) => void;
  isLoading: boolean;
}

// Stacks address: SP... or SM... followed by base58 chars
const STACKS_REGEX = /^S[MP][A-Z0-9]{28,48}$/;

export default function AddressInput({ onSubmit, isLoading }: AddressInputProps) {
  const [address, setAddress] = useState("");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();

    if (!trimmed) {
      setValidationError("Please enter a Stacks wallet address.");
      return;
    }
    if (!STACKS_REGEX.test(trimmed)) {
      setValidationError(
        "Invalid format. Stacks addresses start with SP or SM."
      );
      return;
    }

    setValidationError("");
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="relative group">
        {/* Glow border */}
        <div
          className="absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(135deg, rgba(249,115,22,0.5) 0%, transparent 50%, rgba(249,115,22,0.3) 100%)",
          }}
        />

        <div className="relative flex items-center rounded-xl overflow-hidden"
          style={{ background: "var(--bg-800)", border: "1px solid var(--border)" }}
        >
          {/* Wallet icon */}
          <span className="pl-4 pr-2 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--text-muted)" }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M16 12a1 1 0 0 0 0 2h4v-2h-4z"/>
            </svg>
          </span>

          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (validationError) setValidationError("");
            }}
            placeholder="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            aria-label="Stacks wallet address"
            className="flex-1 bg-transparent py-4 pr-2 text-sm font-mono focus:outline-none placeholder:text-zinc-600"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="m-1.5 shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-display)",
              background: isLoading
                ? "var(--bg-700)"
                : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: isLoading ? "var(--text-muted)" : "#fff",
            }}
            aria-label="Export transactions"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 24"/>
                </svg>
                Fetching…
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
  );
}
