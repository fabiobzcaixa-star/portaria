import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  Building, 
  FileText, 
  BarChart3, 
  ArrowLeft,
  Settings,
  UserPlus,
  Home
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminEmployees } from './AdminEmployees';
import { AdminResidents } from './AdminResidents';
import { AdminReports } from './AdminReports';
import { AdminCondominiums } from './AdminCondominiums'; // Importar o novo componente
import { useAuth } from '../hooks/useAuth';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminView = "dashboard" | "employees" | "residents" | "reports" | "condominiums"; // Adicionar 'condominiums'

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const { user } = useAuth();

  console.log('🔍 AdminPanel - User cargo:', user?.funcionario?.cargo);
  console.log('🔍 AdminPanel - Current view:', currentView);

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return <AdminDashboard />;
      case "employees":
        return <AdminEmployees />;
      case "residents":
        return <AdminResidents />;
      case "reports":
        return <AdminReports />;
      case "condominiums": // Novo case
        return <AdminCondominiums />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Painel Administrativo
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant={currentView === "dashboard" ? "default" : "outline"}
            className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 text-sm px-2"
            onClick={() => setCurrentView("dashboard")}
          >
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Dashboard</span>
          </Button>

          <Button
            variant={currentView === "employees" ? "default" : "outline"}
            className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 text-sm px-2"
            onClick={() => setCurrentView("employees")}
          >
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Funcionários</span>
          </Button>

          <Button
            variant={currentView === "residents" ? "default" : "outline"}
            className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 text-sm px-2"
            onClick={() => setCurrentView("residents")}
          >
            <Home className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Moradores</span>
          </Button>

          <Button
            variant={currentView === "reports" ? "default" : "outline"}
            className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 text-sm px-2"
            onClick={() => setCurrentView("reports")}
          >
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Relatórios</span>
          </Button>
          
          {/* Botão de Condomínios integrado na grade */}
          {user?.funcionario?.cargo === 'super_administrador' && (
            <Button
              variant={currentView === "condominiums" ? "default" : "outline"}
              className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 text-sm px-2 bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200"
              onClick={() => {
                console.log('🏢 Clicou em Condomínios!');
                setCurrentView("condominiums");
              }}
            >
              <Building className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Condomínios</span>
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
};