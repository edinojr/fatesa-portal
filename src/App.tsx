import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Landing from './pages/Landing'
import Sobre from './pages/Sobre'
import Metodologia from './pages/Metodologia'
import Patrono from './pages/Patrono'
import CursosPublic from './pages/CursosPublic'
import Contato from './pages/Contato'
import ModulosFinalizados from './pages/ModulosFinalizados'
import Matricula from './pages/Matricula'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ProtectedRoute from './components/ProtectedRoute'
import AnalyticsTracker from './components/AnalyticsTracker'

// Optimized Lazy Imports
const DashboardBridge = lazy(() => import('./components/DashboardBridge'))
const ModuleDetails = lazy(() => import('./pages/ModuleDetails'))
const SmartViewer = lazy(() => import('./pages/SmartViewer'))
const Lesson = lazy(() => import('./pages/Lesson'))
const Admin = lazy(() => import('./pages/Admin'))
const Professor = lazy(() => import('./pages/Professor'))
const BlockedAccess = lazy(() => import('./pages/BlockedAccess'))
const AppConstruction = lazy(() => import('./pages/AppConstruction'))

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnalyticsTracker />
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: 'var(--primary)' }}>Carregando...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/metodologia" element={<Metodologia />} />
          <Route path="/patrono" element={<Patrono />} />
          <Route path="/cursos" element={<CursosPublic />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/matricula" element={<Matricula />} />
          <Route path="/app-mobile" element={<AppConstruction />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardBridge /></ProtectedRoute>} />
          <Route path="/modulos-finalizados" element={<ProtectedRoute><ModulosFinalizados /></ProtectedRoute>} />
          <Route path="/vencido" element={<BlockedAccess />} />
          <Route path="/lesson/:id" element={<ProtectedRoute><Lesson /></ProtectedRoute>} />
          <Route path="/book/:id" element={<ProtectedRoute><SmartViewer /></ProtectedRoute>} />
          <Route path="/module/:id" element={<ProtectedRoute><ModuleDetails /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
          <Route path="/professor" element={<ProtectedRoute requiredRole="professor"><Professor /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App

