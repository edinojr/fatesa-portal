import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Lesson from './pages/Lesson'
import SmartViewer from './pages/SmartViewer'
import Admin from './pages/Admin'
import Professor from './pages/Professor'
import Landing from './pages/Landing'
import Matricula from './pages/Matricula'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ProfessorLogin from './pages/ProfessorLogin'
import AdminLogin from './pages/AdminLogin'
import ProtectedRoute from './components/ProtectedRoute'


function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/matricula" element={<Matricula />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lesson/:id" element={<Lesson />} />
        <Route path="/book/:id" element={<SmartViewer />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
        <Route path="/professor" element={<ProtectedRoute requiredRole="professor"><Professor /></ProtectedRoute>} />
        <Route path="/professor/login" element={<ProfessorLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

