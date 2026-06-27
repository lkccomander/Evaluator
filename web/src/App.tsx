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
import AdminBannerConfig from './pages/AdminBannerConfig'
import AdminSettings from './pages/AdminSettings'
import AdminSchedule from './pages/AdminSchedule'
import PredictionGraphPage from './pages/PredictionGraphPage'
import BarChartRacePage from './pages/BarChartRacePage'
import Status from './pages/Status'
import Knockout from './pages/Knockout'
import KnockoutLeaderboard from './pages/KnockoutLeaderboard'
import AdminKnockout from './pages/AdminKnockout'

import Results from './pages/Results'

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
          <Route path="/knockout" element={<Protected><Knockout /></Protected>} />
          <Route path="/knockout/leaderboard" element={<Protected><KnockoutLeaderboard /></Protected>} />
          <Route path="/results" element={<Protected><Results /></Protected>} />
          <Route path="/my-predictions" element={<Protected><MyPredictions /></Protected>} />
          <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
          <Route path="/leaderboard/my-league" element={<Protected><Leaderboard /></Protected>} />
          <Route path="/admin/leagues" element={<AdminRoute><AdminLeagues /></AdminRoute>} />
          <Route path="/admin/knockout" element={<AdminRoute><AdminKnockout /></AdminRoute>} />
          <Route path="/admin/results" element={<AdminRoute><AdminResults /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/banner-config" element={<AdminRoute><AdminBannerConfig /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          <Route path="/admin/schedule" element={<AdminRoute><AdminSchedule /></AdminRoute>} />
          <Route path="/prediction-graph" element={<Protected><PredictionGraphPage /></Protected>} />
          <Route path="/race" element={<Protected><BarChartRacePage /></Protected>} />
          <Route path="/status" element={<Status />} />

        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
