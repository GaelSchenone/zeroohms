import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './HomePage.jsx'
import Login from './admin/Login.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import ProtectedRoute from './components/admin/ProtectedRoute.jsx'
import Dashboard from './admin/Dashboard.jsx'
import TicketsList from './admin/TicketsList.jsx'
import TicketDetail from './admin/TicketDetail.jsx'
import TicketCreate from './admin/TicketCreate.jsx'
import ClientesList from './admin/ClientesList.jsx'
import ClienteDetail from './admin/ClienteDetail.jsx'
import ClienteCreate from './admin/ClienteCreate.jsx'
import TareasList from './admin/TareasList.jsx'
import PresupuestosList from './admin/PresupuestosList.jsx'
import ChecklistsList from './admin/ChecklistsList.jsx'
import ChecklistCreate from './admin/ChecklistCreate.jsx'
import ChecklistEdit from './admin/ChecklistEdit.jsx'
import ChecklistRun from './admin/ChecklistRun.jsx'
import UsuariosList from './admin/UsuariosList.jsx'
import Ajustes from './admin/Ajustes.jsx'
import TrackingPage from './pages/TrackingPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tracking" element={<TrackingPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<TicketsList />} />
          <Route path="tickets/nuevo" element={<TicketCreate />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="clientes" element={<ClientesList />} />
          <Route path="clientes/nuevo" element={<ClienteCreate />} />
          <Route path="clientes/:dni" element={<ClienteDetail />} />
          <Route path="tareas" element={<TareasList />} />
          <Route path="presupuestos" element={<PresupuestosList />} />
          <Route path="checklists" element={<ChecklistsList />} />
          <Route path="checklists/nueva" element={<ChecklistCreate />} />
          <Route path="checklists/:id" element={<ChecklistEdit />} />
          <Route path="checklists/:id/ejecutar" element={<ChecklistRun />} />
          <Route path="usuarios" element={<UsuariosList />} />
          <Route path="ajustes" element={<Ajustes />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
