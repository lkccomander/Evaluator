import { useState, useEffect, useRef } from 'react'
import { getSettings, updateSetting, getCarouselImages, updateCarouselImages, uploadCarouselImage, deleteCarouselImage } from '../api/settings'
import type { CarouselImageInfo } from '../api/settings'

const OPTIONS = [
  { value: 'always', label: 'Siempre visibles' },
  { value: 'locked_only', label: 'Solo cuando cierra el pronóstico' },
]

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [carousel, setCarousel] = useState<{ available: CarouselImageInfo[]; active: string[] } | null>(null)
  const [carouselSaving, setCarouselSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([
      getSettings(),
      getCarouselImages(),
    ])
      .then(([s, c]) => { setSettings(s); setCarousel(c) })
      .catch(err => setError(err instanceof Error ? err.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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

  const toggleImage = async (img: CarouselImageInfo) => {
    if (!carousel) return
    setCarouselSaving(true)
    setError('')
    const active = carousel.active.includes(img.url)
      ? carousel.active.filter(u => u !== img.url)
      : [...carousel.active, img.url]
    try {
      await updateCarouselImages(active)
      setCarousel({ ...carousel, active })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
    setCarouselSaving(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await uploadCarouselImage(file)
      await updateCarouselImages([...(carousel?.active || []), res.image.url])
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (img: CarouselImageInfo) => {
    if (!confirm(`¿Eliminar ${img.filename}?`)) return
    setCarouselSaving(true)
    setError('')
    try {
      await deleteCarouselImage(img.filename)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
    setCarouselSaving(false)
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

      <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-4">
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
      </div>

      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">Fotos del carrusel de inicio de sesión</h2>
        <p className="text-xs text-muted mb-3">Selecciona las imágenes que aparecerán en el fondo del login</p>

        <div className="flex flex-col gap-2 mb-4">
          {carousel?.available.map(img => {
            const isActive = carousel.active.includes(img.url)
            return (
              <div key={img.url} className={`flex items-center gap-3 rounded px-3 py-2 transition-colors ${isActive ? 'bg-gold/10 border border-gold/30' : 'bg-surface/50 border border-transparent'}`}>
                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleImage(img)}
                    disabled={carouselSaving}
                    className="accent-gold w-4 h-4 shrink-0"
                  />
                  <img
                    src={img.url}
                    alt={img.filename}
                    className="w-16 h-10 object-cover rounded shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-xs truncate">{img.filename}</span>
                </label>
                {img.url.startsWith('/api/v1/uploads/') && (
                  <button
                    onClick={() => handleDelete(img)}
                    disabled={carouselSaving}
                    className="text-error/60 hover:text-error text-xs shrink-0 transition-colors px-1"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
          {(!carousel || carousel.available.length === 0) && (
            <p className="text-xs text-muted">No hay imágenes disponibles</p>
          )}
        </div>

        <div className="border-t border-surface-border pt-3">
          <p className="text-xs text-muted mb-2">Subir nueva imagen</p>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/avif,image/webp"
              onChange={handleUpload}
              disabled={uploading}
              className="block text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gold file:text-black file:cursor-pointer hover:file:brightness-110 transition-all"
            />
            {uploading && <span className="text-xs text-muted">Subiendo…</span>}
          </div>
        </div>
      </div>

      {saving && <p className="text-xs text-muted mt-2">Guardando…</p>}
      {error && <p className="text-error text-xs mt-2">{error}</p>}
    </div>
  )
}
