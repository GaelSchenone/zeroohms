import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './HomePage.jsx'
import TrackingPage from './pages/TrackingPage.jsx'
import SubirFotosPage from './pages/SubirFotosPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/subir-fotos" element={<SubirFotosPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
