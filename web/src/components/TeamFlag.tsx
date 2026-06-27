import {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI,
  CO, CV, CW, CZ, DE, DZ, EC, EG, ES, FR,
  GB, GB_ENG, GB_SCT, GH, HR, HT, IQ, IR, JO, JP,
  KR, MA, MX, NL, NO, NZ, PA, PT, PY, QA, SA,
  SE, SN, TN, TR, US, UY, UZ, ZA,
} from 'country-flag-icons/react/1x1'
import type { FC } from 'react'
import { teamFlags } from '../lib/teamFlags'

const flagMap: Record<string, FC<{ className?: string }>> = {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI,
  CO, CV, CW, CZ, DE, DZ, EC, EG, ES, FR,
  GB,
  "GB-ENG": GB_ENG,
  "GB-SCT": GB_SCT,
  GH, HR, HT, IQ, IR, JO, JP,
  KR, MA, MX, NL, NO, NZ, PA, PT, PY, QA, SA,
  SE, SN, TN, TR, US, UY, UZ, ZA,
}

function TeamFlag({ code, className }: { code: string; className?: string }) {
  const Flag = flagMap[code]
  if (!Flag) return null
  return <Flag className={className} />
}

export function TeamName({ name, align = 'left' }: { name: string; align?: 'left' | 'right' | 'center' }) {
  const code = teamFlags[name]
  if (align === 'right') {
    return (
      <div className="inline-flex items-center justify-end gap-1.5 min-w-0 max-w-full">
        <span className="truncate">{name}</span>
        {code && <TeamFlag code={code} className="h-5 w-5 shrink-0 rounded-sm" />}
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
      {code && <TeamFlag code={code} className="h-5 w-5 shrink-0 rounded-sm" />}
      <span className="truncate">{name}</span>
    </div>
  )
}

export function PlayerTeamName({
  name,
  verified = false,
  disabled = false,
  roundOf16 = false,
}: {
  name: string
  verified?: boolean
  disabled?: boolean
  roundOf16?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
      {roundOf16 && <span title="Segunda ronda" aria-label="Segunda ronda">⚽️</span>}
      <span className="truncate">{name}</span>
      {verified && <span title="Jugador verificado" aria-label="Jugador verificado">✅</span>}
      {disabled && <span className="text-error font-bold" title="Jugador deshabilitado" aria-label="Jugador deshabilitado">✗</span>}
    </span>
  )
}
