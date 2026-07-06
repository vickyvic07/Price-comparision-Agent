import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

import Navbar          from './components/Navbar';
import ProtectedRoute  from './components/ProtectedRoute';

import SearchPage       from './pages/SearchPage';
import ResultsPage      from './pages/ResultsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import WishlistPage     from './pages/WishlistPage';
import ChatPage         from './pages/ChatPage';
import AlertsPage       from './pages/AlertsPage';
import SettingsPage     from './pages/SettingsPage';
import LoginPage        from './pages/LoginPage';
import SignupPage       from './pages/SignupPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public auth routes — no Navbar */}
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* App shell with Navbar */}
            <Route path="/" element={
              <Layout>
                <SearchPage />
              </Layout>
            } />

            <Route path="/results" element={
              <Layout>
                <ResultsPage />
              </Layout>
            } />

            <Route path="/product/:id" element={
              <Layout>
                <ProductDetailPage />
              </Layout>
            } />

            <Route path="/chat" element={
              <Layout>
                <ChatPage />
              </Layout>
            } />

            {/* Protected routes */}
            <Route path="/wishlist" element={
              <Layout>
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              </Layout>
            } />

            <Route path="/alerts" element={
              <Layout>
                <ProtectedRoute>
                  <AlertsPage />
                </ProtectedRoute>
              </Layout>
            } />

            <Route path="/settings" element={
              <Layout>
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              </Layout>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
