'use client'

interface StyleSelectorProps {
  selectedStyles: string[]
  onStylesChange: (styles: string[]) => void
}

const availableStyles = [
  "Lifestyle no subject",
  "Lifestyle + Subject",
  "Emotionally driven",
  "Studio Style",
  "Close-up shot",
  "White background",
]

export default function StyleSelector({ selectedStyles, onStylesChange }: StyleSelectorProps) {
  const toggleStyle = (style: string) => {
    onStylesChange(
      selectedStyles.includes(style)
        ? selectedStyles.filter((s) => s !== style)
        : [...selectedStyles, style]
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <label className="text-sm font-medium text-gray-700">Styles</label>
        <div className="group relative">
          <svg
            className="w-4 h-4 text-gray-400 cursor-help"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Select one or more
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {availableStyles.map((style) => (
          <button
            key={style}
            onClick={() => toggleStyle(style)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              selectedStyles.includes(style)
                ? "bg-pink-500 text-white border-pink-500"
                : "border-gray-300 hover:border-pink-300 hover:bg-pink-50"
            }`}
          >
            {style}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">Generating multiple styles increases processing time</p>
    </div>
  )
}