import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
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
          <Route path="/" element={<MainLayout><Landing /></MainLayout>} />
          <Route path="/sobre" element={<MainLayout><Sobre /></MainLayout>} />
          <Route path="/metodologia" element={<MainLayout><Metodologia /></MainLayout>} />
          <Route path="/patrono" element={<MainLayout><Patrono /></MainLayout>} />
          <Route path="/cursos" element={<MainLayout><CursosPublic /></MainLayout>} />
          <Route path="/contato" element={<MainLayout><Contato /></MainLayout>} />
          <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
          <Route path="/signup" element={<MainLayout><Signup /></MainLayout>} />
          <Route path="/forgot-password" element={<MainLayout><ForgotPassword /></MainLayout>} />
          <Route path="/reset-password" element={<MainLayout><ResetPassword /></MainLayout>} />
          <Route path="/matricula" element={<MainLayout><Matricula /></MainLayout>} />
          <Route path="/verificacao" element={<MainLayout><CertificateVerification /></MainLayout>} />
          <Route path="/verificacao/:code" element={<MainLayout><CertificateVerification /></MainLayout>} />
          <Route path="/app-mobile" element={<MainLayout><AppConstruction /></MainLayout>} />
          <Route path="/dashboard" element={<ProtectedRoute><MainLayout><DashboardBridge /></MainLayout></ProtectedRoute>} />
          <Route path="/modulos-finalizados" element={<ProtectedRoute><MainLayout><ModulosFinalizados /></MainLayout></ProtectedRoute>} />
          <Route path="/vencido" element={<ProtectedRoute><MainLayout><BlockedAccess /></MainLayout></ProtectedRoute>} />
          <Route path="/lesson/:id" element={<ProtectedRoute><MainLayout><Lesson /></MainLayout></ProtectedRoute>} />
          <Route path="/book/:id" element={<ProtectedRoute><MainLayout><SmartViewer /></MainLayout></ProtectedRoute>} />
          <Route path="/module/:id" element={<ProtectedRoute><MainLayout><ModuleDetails /></MainLayout></ProtectedRoute>} />
           <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
           <Route path="/professor" element={<ProtectedRoute requiredRole="professor"><Professor /></ProtectedRoute>} />
           <Route path="/coordenador" element={<ProtectedRoute requiredRole="coordenador_polo"><Coordinator /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App

