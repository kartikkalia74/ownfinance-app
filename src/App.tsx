import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { initDB } from './db/sqlite'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Lending from './pages/Lending'
import LendingDetail from './pages/LendingDetail'
import Login from './pages/Login'
import Categories from './pages/Categories'
import Upload from './pages/Upload'
import RequireAuth from './components/auth/RequireAuth'
import { useDriveSync } from './hooks/useDriveSync'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

function App() {
  useDriveSync();
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    console.log('App: Starting DB Init...');
    initDB().then(() => {
      console.log('App: DB Init Success');
      setIsDbReady(true);
    }).catch(e => {
      console.error('App: DB Init Failed', e);
    });
  }, []);

  if (!isDbReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">Initializing Finance PWA...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="borrow-lend" element={<Lending />} />
            <Route path="borrow-lend/:id" element={<LendingDetail />} />
            <Route path="categories" element={<Categories />} />
            <Route path="upload" element={<Upload />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
