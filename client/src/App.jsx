import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Overview from './pages/Overview';
import Schedules from './pages/Schedules';
import Rooms from './pages/Rooms';
import Events from './pages/Events';
import Announcements from './pages/Announcements';
import Assignments from './pages/Assignments';
import Assistant from './pages/Assistant';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="events" element={<Events />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
