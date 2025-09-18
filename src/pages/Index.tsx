import { useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Dashboard } from "@/components/Dashboard";
import { SimpleDeliveryForm } from "@/components/SimpleDeliveryForm";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'delivery'>('dashboard');

  console.log('🏠 INDEX PAGE - User:', user ? 'LOGGED IN' : 'NOT LOGGED IN');
  console.log('🏠 INDEX PAGE - User cargo:', user?.funcionario?.cargo);
  console.log('🏠 INDEX PAGE - Current view:', currentView);

  // Dados reais dos moradores
  const moradores = [
    {
      id: '1',
      nome: 'Fabio Brito Zissou',
      apartamento: '1905',
      bloco: 'A',
      telefone: '(11) 99999-1111'
    },
    {
      id: '2',
      nome: 'Sofia de Jesus Zissou',
      apartamento: '1905',
      bloco: 'A',
      telefone: '(11) 99999-2222'
    },
    {
      id: '3',
      nome: 'Nicollas de Jesus Zissou',
      apartamento: '1905',
      bloco: 'A',
      telefone: '(11) 99999-3333'
    },
    {
      id: '4',
      nome: 'Maria Santos',
      apartamento: '1001',
      bloco: 'B',
      telefone: '(11) 98888-4444'
    },
    {
      id: '5',
      nome: 'Carlos Silva',
      apartamento: '2003',
      bloco: 'C',
      telefone: '(11) 97777-5555'
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoginForm onLogin={login} />
      </div>
    );
  }

  if (currentView === 'delivery') {
    return (
      <SimpleDeliveryForm 
        onBack={() => setCurrentView('dashboard')}
        moradores={moradores}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Dashboard 
        authUser={user} 
        onLogout={logout}
      />
    </div>
  );
};

export default Index;
