import { useCountdown } from '../hooks/useCountdown'

export default function Countdown({ targetUTC }: { targetUTC: string }) {
  const { label, expired } = useCountdown(targetUTC)

  return (
    <span className={`font-mono text-xs ${expired ? 'text-error' : 'text-muted'}`}>
      {expired ? 'CERRADO' : label}
    </span>
  )
}
