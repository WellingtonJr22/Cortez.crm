import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

import AppLayout from '@/components/layout/AppLayout';
import Pipeline from '@/pages/Pipeline';
import Chat from '@/pages/Chat';
import Dashboard from '@/pages/Dashboard';
import Automacoes from '@/pages/Automacoes';
import Leads from '@/pages/Leads';
import DocumentacaoTecnica from '@/pages/DocumentacaoTecnica';
import Configuracoes from '@/pages/Configuracoes';
import Disparos from '@/pages/Disparos';
import IntegracaoN8N from '@/pages/IntegracaoN8N';
import Login from '@/pages/Login';
import { Navigate } from 'react-router-dom';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Pipeline />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/automacoes" element={<Automacoes />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/docs" element={<DocumentacaoTecnica />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/disparos" element={<Disparos />} />
          <Route path="/n8n" element={<IntegracaoN8N />} />
        </Route>
      </Route>
      <Route path="/logout" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App