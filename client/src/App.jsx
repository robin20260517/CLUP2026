import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MatchDetail from './pages/MatchDetail';
import Schedule from './pages/Schedule';
import Groups from './pages/Groups';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="match/:id" element={<MatchDetail />} />
          <Route path="groups" element={<Groups />} />
          <Route path="schedule" element={<Schedule />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
