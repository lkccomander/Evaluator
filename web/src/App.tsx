import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import JoinLeague from './pages/JoinLeague'
import Matches from './pages/Matches'
import MyPredictions from './pages/MyPredictions'
import Leaderboard from './pages/Leaderboard'
import AdminLeagues from './pages/AdminLeagues'
import AdminResults from './pages/AdminResults'
import AdminUsers from './pages/AdminUsers'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/matches" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join-league" element={<Protected><JoinLeague /></Protected>} />
          <Route path="/matches" element={<Protected><Matches /></Protected>} />
          <Route path="/my-predictions" element={<Protected><MyPredictions /></Protected>} />
          <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
          <Route path="/leaderboard/my-league" element={<Protected><Leaderboard /></Protected>} />
          <Route path="/admin/leagues" element={<AdminRoute><AdminLeagues /></AdminRoute>} />
          <Route path="/admin/results" element={<AdminRoute><AdminResults /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
