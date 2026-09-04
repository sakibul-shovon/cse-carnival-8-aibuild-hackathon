import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import SchedulesPage from './pages/SchedulesPage';
import RoomsPage from './pages/RoomsPage';
import EventsPage from './pages/EventsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ChatPage from './pages/ChatPage';
import { ToastProvider } from './components/Toast';

// Configure QueryClient with zero staleTime to enforce live data reads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page Route */}
            <Route path="/" element={<LandingPage />} />

            {/* Dashboard Application Routes */}
            <Route element={<Layout />}>
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/dashboard" element={<Navigate to="/schedules" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
