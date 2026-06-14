import { useState, useEffect } from 'react'
import { getSettings, updateSetting } from '../api/settings'

const OPTIONS = [
  { value: 'always', label: 'Siempre visibles' },
  { value: 'locked_only', label: 'Solo cuando cierra el pronóstico' },
]

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(err => setError(err instanceof Error ? err.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = async (key: string, value: string) => {
    setSaving(true)
    setError('')
    try {
      await updateSetting(key, value)
      setSettings(prev => prev ? { ...prev, [key]: value } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
    setSaving(false)
  }

  if (loading) return <p className="text-muted text-sm">Cargando…</p>

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Configuración</h1>

      <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium mb-3">Visibilidad de gráficos de pronósticos</label>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="chart_visibility"
                value={opt.value}
                checked={settings?.prediction_chart_visibility === opt.value}
                onChange={() => handleChange('prediction_chart_visibility', opt.value)}
                disabled={saving}
                className="accent-gold"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings?.show_prediction_names === 'true'}
            onChange={e => handleChange('show_prediction_names', e.target.checked ? 'true' : 'false')}
            disabled={saving}
            className="accent-gold w-4 h-4"
          />
          <span className="text-sm font-medium">Mostrar nombres en lista de pronósticos</span>
        </label>
        {saving && <p className="text-xs text-muted mt-2">Guardando…</p>}
        {error && <p className="text-error text-xs mt-2">{error}</p>}
      </div>
    </div>
  )
}
