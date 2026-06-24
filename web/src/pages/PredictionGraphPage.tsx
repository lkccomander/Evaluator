import { useQuery } from '@tanstack/react-query'
import { getPredictionGraph } from '../api/visualization'
import PredictionGraph from '../components/PredictionGraph'

export default function PredictionGraphPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['prediction-graph'],
    queryFn: getPredictionGraph,
    refetchInterval: 30_000,
  })

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Mapa de Predicciones</h1>
      <p className="text-sm text-muted mb-4">
        Grafo de los 72 partidos. Cada línea conecta dos selecciones que se enfrentan.
        El color de la línea muestra si la mayoría predijo <strong className="text-[#3b82f6]">local</strong>,
        {' '}<strong className="text-[#6b7280]">empate</strong> o <strong className="text-[#ef4444]">visita</strong>.
        El tamaño del círculo = cantidad de predicciones que involucran a ese equipo.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <p className="text-error text-sm text-center py-8">Error al cargar el grafo</p>
      )}
      {data && (
        <PredictionGraph nodes={data.nodes} links={data.links} />
      )}
    </div>
  )
}
