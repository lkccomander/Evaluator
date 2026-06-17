import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { request } from '../api/client'

const DEFAULT_IMAGES = [
  '/images/08df4a44ebe754bf87a83d726eb61e07.webp',
  '/images/17814956293738.avif',
  '/images/C67VEP5MSBKFRJ6WTIUPOOJVCU.avif',
  '/images/Cote-D-Ivoire-v-Ecuador-Group-E-FIFA-World-Cup-2026.avif',
  '/images/Netherlands-v-Japan-Group-F-FIFA-World-Cup-2026.avif',
  '/images/Sin-titulo-1.avif',
  '/images/Sweden-v-Tunisia-Group-F-FIFA-World-Cup-2026.avif',
  '/images/top-fifa-world-cup-2026-players-profile.jpg.webp',
  '/images/uru1.png',
  '/images/uru2.png',
  '/images/uru3.png',
  '/images/spain1.png',
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [current, setCurrent] = useState(0)
  const [images, setImages] = useState<string[]>(DEFAULT_IMAGES)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    request<Record<string, string>>('/public/settings')
      .then(res => {
        if (res?.login_carousel_images) {
          try {
            const parsed = JSON.parse(res.login_carousel_images)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setImages(parsed.map((v: string) => v.startsWith('/') ? v : `/images/${v}`))
            }
          } catch { /* fallback */ }
        }
      })
      .catch(() => { /* use defaults */ })
  }, [])

  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length)
    }, 7000)
    return () => clearInterval(id)
  }, [images.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/matches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === current ? 1 : 0,
            transform: `scale(${i === current ? 1.05 : 1})`,
            transition: 'opacity 1.5s ease-in-out, transform 7s ease-in-out',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 via-30% to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        <div className="bg-surface-card/90 backdrop-blur-sm border border-surface-border/60 rounded-lg p-8 w-full max-w-sm shadow-2xl shadow-black/50">
          <h1 className="text-xl font-bold text-gold mb-6 text-center tracking-wide">Iniciar Sesión</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-surface/80 border border-surface-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold transition-colors"
              required
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="bg-surface/80 border border-surface-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold transition-colors"
              required
            />
            {error && <p className="text-error text-xs">{error}</p>}
            <button
              type="submit"
              className="bg-gold text-black font-semibold py-2.5 rounded text-sm hover:brightness-110 active:brightness-90 transition-all"
            >
              Entrar
            </button>
          </form>
          <p className="text-center text-xs text-muted/80 mt-5">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-gold hover:underline underline-offset-2">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
