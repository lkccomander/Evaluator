import { useQuery } from '@tanstack/react-query'
import { getMatches } from '../api/matches'
import { getMyPredictions } from '../api/predictions'
import { useAuth } from '../hooks/useAuth'
import MatchCard from '../components/MatchCard'
import LeagueBanner from '../components/LeagueBanner'
import { request } from '../api/client'

export default function Matches() {
  const { user } = useAuth()

  const { data: matches, isLoading, isError } = useQuery({
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

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => request<Record<string, string>>('/public/settings'),
    staleTime: 60_000,
  })

  const chartVisibility = (publicSettings?.prediction_chart_visibility || 'locked_only') as 'always' | 'locked_only'
  const showPredictionNames = publicSettings?.show_prediction_names === 'true'

  const predMap = new Map(
    predictions?.map(p => [p.match_id, { home: p.home_score_pred, away: p.away_score_pred, pen_home_pred: p.pen_home_pred, pen_away_pred: p.pen_away_pred }]) ?? [],
  )

  const upcoming = matches?.filter(m => m.status !== 'finished') ?? []

  if (isLoading) {
    return (
      <div>
        <LeagueBanner />
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <LeagueBanner />
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-error text-sm">Error al cargar los partidos</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <LeagueBanner />
      <h1 className="text-lg font-bold mb-4">Partidos</h1>
      {!upcoming.length ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">No hay partidos disponibles</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              userHasLeague={!!user?.league_id}
              userPrediction={predMap.get(m.id)}
              leagueId={user?.league_id ?? undefined}
              chartVisibility={chartVisibility}
              showPredictionNames={showPredictionNames}
            />
          ))}
        </div>
      )}
    </div>
  )
}
