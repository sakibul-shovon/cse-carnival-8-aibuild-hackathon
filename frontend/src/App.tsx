import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import SchedulePage from './pages/SchedulePage';
import UsersPage from './pages/UsersPage';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/announcements" replace />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;