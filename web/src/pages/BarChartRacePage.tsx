import { useQuery } from '@tanstack/react-query'
import { getLeaderboardHistory } from '../api/leaderboard'
import BarChartRace from '../components/BarChartRace'

export default function BarChartRacePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard-history', 'global'],
    queryFn: () => getLeaderboardHistory(),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return <p className="text-muted text-sm text-center py-12">Cargando historial...</p>
  }
  if (isError || !data) {
    return <p className="text-danger text-sm text-center py-12">Error al cargar historial</p>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Carrera de Puntos</h1>
      <p className="text-sm text-muted">
        Evolución del puntaje de los jugadores a lo largo del mundial.
      </p>
      <BarChartRace data={data} />
    </div>
  )
}
