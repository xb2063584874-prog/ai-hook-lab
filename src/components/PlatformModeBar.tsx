"use client"

import type { PlatformMode } from "@/types"
import { PLATFORM_MODES } from "@/types"

interface Props {
  value: PlatformMode
  onChange: (mode: PlatformMode) => void
}

const modes = Object.keys(PLATFORM_MODES) as PlatformMode[]

export default function PlatformModeBar({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5 overflow-x-auto shrink-0">
      {modes.map((key) => {
        const meta = PLATFORM_MODES[key]
        const active = value === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200
              ${active
                ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                : "bg-white/60 text-gray-500 hover:bg-white hover:text-gray-700 border border-gray-100"
              }`}
          >
            <span className="mr-1">{meta.icon}</span>
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
