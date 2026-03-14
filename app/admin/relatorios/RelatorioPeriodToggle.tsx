'use client'

import { useRouter, usePathname } from 'next/navigation'

const OPTIONS = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
]

export default function RelatorioPeriodToggle({ period }: { period: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => router.push(`${pathname}?period=${opt.value}`)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            period === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
