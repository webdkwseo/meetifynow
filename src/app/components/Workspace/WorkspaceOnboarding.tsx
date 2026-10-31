"use client";

import { motion } from "framer-motion";
import { Building2, Palette } from "lucide-react";
import { DEFAULT_BRAND_COLOR, textOn } from "@/lib/utils";
import { useState } from "react";

const BRAND_COLORS = [
  { hex: DEFAULT_BRAND_COLOR, label: "Navy" },
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#0ea5e9", label: "Blue" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#8b5cf6", label: "Violet" },
];

interface WorkspaceOnboardingProps {
  t: any;
  onSubmit: (name: string, brandingColor: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export default function WorkspaceOnboarding({
  t,
  onSubmit,
  isLoading,
  error,
}: WorkspaceOnboardingProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(BRAND_COLORS[0].hex);
  const [nameError, setNameError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError(t.nameError);
      return;
    }
    setNameError("");
    await onSubmit(name.trim(), color);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-dark/5 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Building2 className="w-5 h-5" style={{ color }} aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-600">{t.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="workspace-onboarding-name"
              className="text-sm font-medium text-gray-700"
            >
              {t.nameLabel}{" "}
              <span className="text-red-600" aria-hidden>
                *
              </span>
            </label>
            <input
              id="workspace-onboarding-name"
              type="text"
              required
              aria-invalid={!!nameError || undefined}
              aria-describedby={
                nameError ? "workspace-onboarding-error" : undefined
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={60}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {nameError && (
              <p
                id="workspace-onboarding-error"
                role="alert"
                className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-xs text-red-600"
              >
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p
              id="onboarding-color-label"
              className="text-sm font-medium text-gray-700 flex items-center gap-1.5"
            >
              <Palette className="w-4 h-4" aria-hidden />
              {t.brandColor}
            </p>
            <div
              role="radiogroup"
              aria-labelledby="onboarding-color-label"
              className="flex flex-wrap gap-3"
            >
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  role="radio"
                  aria-checked={color === c.hex}
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setColor(c.hex)}
                  className="w-8 h-8 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark focus-visible:ring-offset-2"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: color === c.hex ? c.hex : "transparent",
                    boxShadow:
                      color === c.hex ? `0 0 0 3px ${c.hex}40` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: color, color: textOn(color) }}
          >
            <Building2 className="w-4 h-4" aria-hidden />
            {name || t.preview}
          </div>

          {error && (
            <p role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ backgroundColor: color, color: textOn(color) }}
          >
            {isLoading ? t.creating : `${t.submit} →`}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
