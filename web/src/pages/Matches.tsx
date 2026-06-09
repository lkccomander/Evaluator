import { useQuery } from '@tanstack/react-query'
import { getMatches } from '../api/matches'
import { getMyPredictions } from '../api/predictions'
import { useAuth } from '../hooks/useAuth'
import MatchCard from '../components/MatchCard'
import LeagueBanner from '../components/LeagueBanner'

export default function Matches() {
  const { user } = useAuth()

  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
    refetchInterval: 30_000,
  })

  const { data: predictions } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: getMyPredictions,
    enabled: !!user?.league_id,
    refetchInterval: 30_000,
  })

  const predMap = new Map(
    predictions?.map(p => [p.match_id, { home: p.home_score_pred, away: p.away_score_pred }]) ?? [],
  )

  return (
    <div>
      <LeagueBanner />
      <h1 className="text-lg font-bold mb-4">Partidos</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches?.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            userHasLeague={!!user?.league_id}
            userPrediction={predMap.get(m.id)}
          />
        ))}
      </div>
    </div>
  )
}
