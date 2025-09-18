import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { useAuth } from '@/hooks/useAuth';
import Index from '@/pages/Index';
import { useEffect } from 'react';
import ConnectionStatus from '@/components/ConnectionStatus';
import InstallPWA from '@/components/InstallPWA';

function App() {
  const { user, isLoading, login, logout } = useAuth();

  // Prevenir voltar para fora do app
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = (e: PopStateEvent) => {
      // Se estiver logado e tentar voltar, manter no dashboard
      if (user && window.location.pathname === '/') {
        window.history.pushState(null, '', '/dashboard');
      }
    };

    // Adicionar listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Garantir que sempre tenha uma entrada no histórico
    if (user && window.history.length <= 1) {
      window.history.pushState(null, '', '/dashboard');
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const getInitialDashboardView = () => {
    if (!user) return 'search' as const; // Should not happen if we are rendering Dashboard

    // Se o usuário é super administrador, ir direto para o painel de super admin
    if (user.isSuperAdmin || user.funcionario.cargo === 'super_administrador') {
      return 'superadmin' as const;
    }

    // Se o usuário é um administrador e o síndico do seu condomínio, ir para o painel de administração
    if (
      user.funcionario.cargo === 'administrador' &&
      user.condominio &&
      user.condominio.sindico_id === user.funcionario.id
    ) {
      return 'admin' as const;
    }
    // Caso contrário, ir para a vista padrão de porteiro (busca)
    return 'search' as const;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" replace /> : <LoginForm onLogin={login} />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard authUser={user} onLogout={logout} initialView={getInitialDashboardView()} /> : <Navigate to="/" replace />} 
          />
          <Route path="/index" element={<Index />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
        <ConnectionStatus />
        <InstallPWA />
      </div>
    </Router>
  );
}

export default App;
