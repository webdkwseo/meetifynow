"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { DEFAULT_BRAND_COLOR, fmt, textOn } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";

interface WorkspaceSettingsProps {
  t: any;
  workspace: {
    _id: Id<"workspaces">;
    name: string;
    brandingColor?: string;
  };
  onUpdate: (
    workspaceId: Id<"workspaces">,
    data: { name?: string; brandingColor?: string },
  ) => Promise<void>;
  error: string | null;
}

const BRAND_COLORS = [
  DEFAULT_BRAND_COLOR,
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export default function WorkspaceSettings({
  t,
  workspace,
  onUpdate,
  error,
}: WorkspaceSettingsProps) {
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);

  const brandColor = workspace.brandingColor ?? DEFAULT_BRAND_COLOR;

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await onUpdate(workspace._id, { name: name.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${brandColor}20` }}
        >
          <Building2
            className="w-5 h-5"
            style={{ color: brandColor }}
            aria-hidden
          />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{workspace.name}</h2>
          <p className="text-xs text-gray-600">{t.subtitle}</p>
        </div>
      </div>

      {/* Workspace name */}
      <div className="bg-white/90 border border-gray-100/80 rounded-2xl p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-3">
        <label
          htmlFor="workspace-name"
          className="text-sm font-semibold text-gray-700"
        >
          {t.name}
        </label>
        <form onSubmit={handleNameSave} className="flex gap-2">
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={50}
            className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="submit"
            disabled={saving || name.trim() === workspace.name}
            className="px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{ backgroundColor: brandColor, color: textOn(brandColor) }}
          >
            {saving ? t.saving : t.save}
          </button>
        </form>
        {error && (
          <p role="alert" className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Branding color */}
      <div className="bg-white/90 border border-gray-100/80 rounded-2xl p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-3">
        <h3
          id="brand-color-label"
          className="text-sm font-semibold text-gray-700"
        >
          {t.brandColor}
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="brand-color-label"
          className="flex flex-wrap gap-3"
        >
          {BRAND_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={brandColor === c}
              aria-label={fmt(t.colorOption, { color: c })}
              onClick={() => onUpdate(workspace._id, { brandingColor: c })}
              className="w-9 h-9 rounded-full border-2 transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark focus-visible:ring-offset-2"
              style={{
                backgroundColor: c,
                borderColor: brandColor === c ? c : "transparent",
                boxShadow: brandColor === c ? `0 0 0 3px ${c}40` : "none",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
