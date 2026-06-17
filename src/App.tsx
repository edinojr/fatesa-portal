import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AuthLayout, DashboardLayout } from './components/layout/MainLayout'
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
import CertificateVerification from './pages/CertificateVerification'
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
const Coordinator = lazy(() => import('./pages/Coordinator'))

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnalyticsTracker />
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: 'var(--primary)' }}>Carregando...</div>}>
        <Routes>
          <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
          <Route path="/sobre" element={<PublicLayout><Sobre /></PublicLayout>} />
          <Route path="/metodologia" element={<PublicLayout><Metodologia /></PublicLayout>} />
          <Route path="/patrono" element={<PublicLayout><Patrono /></PublicLayout>} />
          <Route path="/cursos" element={<PublicLayout><CursosPublic /></PublicLayout>} />
          <Route path="/contato" element={<PublicLayout><Contato /></PublicLayout>} />
          <Route path="/verificacao" element={<PublicLayout><CertificateVerification /></PublicLayout>} />
          <Route path="/verificacao/:code" element={<PublicLayout><CertificateVerification /></PublicLayout>} />
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
          <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
          <Route path="/matricula" element={<AuthLayout><Matricula /></AuthLayout>} />
          <Route path="/app-mobile" element={<AuthLayout><AppConstruction /></AuthLayout>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardBridge /></DashboardLayout></ProtectedRoute>} />
          <Route path="/modulos-finalizados" element={<ProtectedRoute><DashboardLayout><ModulosFinalizados /></DashboardLayout></ProtectedRoute>} />
          <Route path="/vencido" element={<ProtectedRoute><DashboardLayout><BlockedAccess /></DashboardLayout></ProtectedRoute>} />
          <Route path="/lesson/:id" element={<ProtectedRoute><DashboardLayout><Lesson /></DashboardLayout></ProtectedRoute>} />
          <Route path="/book/:id" element={<ProtectedRoute><DashboardLayout><SmartViewer /></DashboardLayout></ProtectedRoute>} />
          <Route path="/module/:id" element={<ProtectedRoute><DashboardLayout><ModuleDetails /></DashboardLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardLayout><Admin /></DashboardLayout></ProtectedRoute>} />
          <Route path="/professor" element={<ProtectedRoute requiredRole="professor"><DashboardLayout><Professor /></DashboardLayout></ProtectedRoute>} />
          <Route path="/coordenador" element={<ProtectedRoute requiredRole="coordenador_polo"><DashboardLayout><Coordinator /></DashboardLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
