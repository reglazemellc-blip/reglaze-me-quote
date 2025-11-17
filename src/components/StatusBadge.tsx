import { QuoteStatus } from '@db/index'

type Props = {
  status: QuoteStatus
}

export default function StatusBadge({ status }: Props): JSX.Element {
  const text = status.replace('_', ' ')

  // Styles mapped EXACTLY to your QuoteStatus type
  const styles: Record<QuoteStatus, string> = {
    pending: `
      bg-[#1a1a1a]
      border-[#444]
      text-[#e8d487]
    `,
    approved: `
      bg-[#0f200f]
      border-[#3f6a3f]
      text-[#a5ffb0]
    `,
    scheduled: `
      bg-[#1a1505]
      border-[#6a4f1d]
      text-[#ffd36a]
    `,
    in_progress: `
      bg-[#0f1a1a]
      border-[#2a4a4a]
      text-[#7fffd4]
    `,
    completed: `
      bg-[#111111]
      border-[#333]
      text-[#bbbbbb]
    `,
    canceled: `
      bg-[#200d0d]
      border-[#6a2f2f]
      text-[#ff8a8a]
    `
  }

  return (
    <span
      className={`
        px-3 py-1 rounded-full text-xs font-semibold
        border select-none whitespace-nowrap
        ${styles[status]}
      `}
    >
      {text}
    </span>
  )
}
