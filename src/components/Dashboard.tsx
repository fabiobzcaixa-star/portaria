import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LogOut, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Building2,
  Clock,
  CheckCircle,
  Trash2,
  Camera,
  Bell
} from "lucide-react";
import { SearchForm } from "./SearchForm";
import { ResidentList } from "./ResidentList";
import { SimpleDeliveryForm } from "./SimpleDeliveryForm";
import { ReportsPanel } from "./ReportsPanel";
import { WithdrawalPanel } from "./WithdrawalPanel";
import { RemindersPanel } from "./RemindersPanel";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { AdminPanel } from "./AdminPanel";
import { SuperAdminDashboard } from "./SuperAdminDashboard";

interface Resident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
}

interface AuthUser {
  funcionario: any;
  condominio: any;
  moradores: any[];
  isSuperAdmin?: boolean;
  superAdmin?: any;
}

interface DashboardProps {
  authUser: AuthUser;
  onLogout: () => void;
  initialView?: View; // Nova prop opcional para definir a vista inicial
}


type View = "search" | "residents" | "delivery" | "reports" | "withdrawal" | "reminders" | "admin" | "superadmin";

// Usar cliente Supabase centralizado

export const Dashboard = ({ authUser, onLogout, initialView }: DashboardProps) => {
  const [currentView, setCurrentView] = useState<View>(initialView || "search"); // Usar initialView ou padrão
  const [selectedResidents, setSelectedResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [apartmentInfo, setApartmentInfo] = useState({ bloco: "", apartamento: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [condominioNome, setCondominioNome] = useState<string>((import.meta as any).env?.VITE_CONDOMINIO_NOME || authUser?.condominio?.nome || "Condomínio");

  useEffect(() => {
    const fetchCondo = async () => {
      try {
        const { data } = await supabase
          .from('condominios')
          .select('nome')
          .eq('id', authUser?.funcionario?.condominio_id)
          .maybeSingle();
        if (data?.nome) {
          setCondominioNome(data.nome);
        } else {
          const { data: first } = await supabase
            .from('condominios')
            .select('nome')
            .limit(1)
            .maybeSingle();
          if (first?.nome) setCondominioNome(first.nome);
        }
      } catch {}
    };
    fetchCondo();
  }, []);

  const handleSearch = async (bloco: string | null, apartamento: string) => {
    let query = supabase
      .from("moradores")
      .select("*")
      .eq("condominio_id", authUser.funcionario.condominio_id)
      .eq("apartamento", apartamento);

    if (bloco) {
      query = query.eq("bloco", bloco);
    }

    const { data, error } = await query;

    console.log("Busca Supabase:", { data, error, bloco, apartamento });

    if (error) {
      setSelectedResidents([]);
      setApartmentInfo({ bloco: bloco || "", apartamento });
      setCurrentView("residents");
      return;
    }

    const residents = (data || []).map((morador: any) => ({
      id: morador.id,
      name: morador.nome,
      phone: morador.telefone,
      role: "Morador",
    }));

    setSelectedResidents(residents);
    setApartmentInfo({ bloco: bloco || "", apartamento });
    setCurrentView("residents");

    try {
      const first = (data || [])[0];
      if (first?.condominio_id) {
        const { data: condo } = await supabase
          .from('condominios')
          .select('nome')
          .eq('id', first.condominio_id)
          .maybeSingle();
        if (condo?.nome) setCondominioNome(condo.nome);
      }
    } catch {}
  };

  const handleSelectResident = (resident: Resident) => {
    setSelectedResident(resident);
    setCurrentView("delivery");
  };

  const handleDeliveryComplete = () => {
    setCurrentView("search");
    setSelectedResident(null);
    setSelectedResidents([]);
    setApartmentInfo({ bloco: "", apartamento: "" });
    setRefreshKey((k) => k + 1);
  };

  const clearHistory = () => {
    localStorage.removeItem('deliveries');
    setRefreshKey((k) => k + 1);
  };

  const canSeeAdmin = (() => {
    const isAdmin = authUser?.funcionario?.cargo === 'administrador';
    const isSindico = authUser?.funcionario?.cargo === 'sindico';
    const isAdminAndCondoSindico = isAdmin && authUser?.condominio && authUser.condominio.sindico_id === authUser.funcionario.id;
    return isSindico || isAdminAndCondoSindico;
  })();

  const isSuperAdmin = authUser?.isSuperAdmin || authUser?.funcionario?.cargo === 'super_administrador';

  console.log('📊 DASHBOARD - AuthUser:', authUser);
  console.log('📊 DASHBOARD - isSuperAdmin:', isSuperAdmin);
  console.log('📊 DASHBOARD - funcionario.cargo:', authUser?.funcionario?.cargo);
  console.log('📊 DASHBOARD - Current view:', currentView);

  const renderCurrentView = () => {
    switch (currentView) {
      case "search":
        return <SearchForm onSearch={handleSearch} />;
      case "residents":
        return (
          <ResidentList
            residents={selectedResidents}
            apartmentInfo={apartmentInfo}
            onSelectResident={handleSelectResident}
            onBack={() => setCurrentView("search")}
          />
        );
      case "delivery":
        return selectedResident ? (
          <SimpleDeliveryForm
            onBack={() => setCurrentView("residents")}
            moradores={[{
              id: selectedResident.id,
              nome: selectedResident.name,
              apartamento: apartmentInfo.apartamento,
              bloco: apartmentInfo.bloco,
              telefone: selectedResident.phone
            }]}
          />
        ) : null;
      case "withdrawal":
        return <WithdrawalPanel onBack={() => setCurrentView("search")} onChange={handleDeliveryComplete} condominioNome={condominioNome} />;
      case "reports":
        return <ReportsPanel onBack={() => setCurrentView("search")} condominioId={authUser.funcionario.condominio_id} />;
      case "reminders":
        return <RemindersPanel onBack={() => setCurrentView("search")} condominioNome={condominioNome} />;
      case "admin":
        return <AdminPanel onBack={() => setCurrentView("search")} />;
      case "superadmin":
        return <SuperAdminDashboard onBack={() => setCurrentView("search")} />;
      default:
        return <SearchForm onSearch={handleSearch} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-dashboard-header to-muted flex flex-col">
      {/* Header */}
      <header className="bg-dashboard-sidebar border-b border-border shadow-card">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 py-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {localStorage.getItem('internal_logo_url') ? (
                <div className="flex items-center gap-2">
                  <img
                    src={localStorage.getItem('internal_logo_url') || ''}
                    alt="Logo"
                    className="h-8 sm:h-10 object-contain max-w-[150px] sm:max-w-[200px]"
                  />
                </div>
              ) : (
                <>
                  <div className="p-1.5 sm:p-2 bg-gradient-primary rounded-lg">
                    <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                      Entregas Zap
                    </h1>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm sm:text-base text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                  {condominioNome}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Badge variant="secondary" className="hidden sm:flex text-base">
                {authUser.funcionario.nome}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-foreground px-2 sm:px-3"
              >
                <LogOut className="h-5 w-5 sm:mr-2" />
                <span className="text-base">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-dashboard-sidebar border-b border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 py-3 sm:py-4">
            <Button
              variant={currentView === "search" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("search")}
              className="flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 text-base font-medium whitespace-normal break-words h-auto min-h-[50px]"
            >
              <Package className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="truncate">Nova Entrega</span>
            </Button>
            
            <Button
              variant={currentView === "withdrawal" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("withdrawal")}
              className="flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 text-base font-medium whitespace-normal break-words h-auto min-h-[50px]"
            >
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="truncate">Retiradas</span>
            </Button>
            
            <Button
              variant={currentView === "reports" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("reports")}
              className="flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 text-base font-medium whitespace-normal break-words h-auto min-h-[50px]"
            >
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="truncate">Relatórios</span>
            </Button>
            
            <Button
              variant={currentView === "reminders" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("reminders")}
              className="flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 text-base font-medium whitespace-normal break-words h-auto min-h-[50px]"
            >
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="truncate">Lembretes</span>
            </Button>

            {canSeeAdmin && (
              <Button
                variant={currentView === "admin" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("admin")}
                className="flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 text-base font-medium whitespace-normal break-words h-auto min-h-[50px]"
              >
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="truncate">Admin</span>
              </Button>
            )}

            {isSuperAdmin && (
              <Button
                variant={currentView === "superadmin" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("superadmin")}
                className="flex items-center gap-2 sm:gap-2 px-3 sm:px-4 py-2 text-base font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white whitespace-normal break-words h-auto min-h-[50px]"
              >
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="truncate">Super</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full">
        <main>
          {renderCurrentView()}
        </main>
      </div>
      {/* Footer de suporte */}
      <footer className="bg-dashboard-sidebar border-t border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
          <span className="text-muted-foreground">Suporte:</span>
          <a
            href="https://wa.me/5511970307000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-green-600 hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
              <path d="M20.52 3.48A11.73 11.73 0 0012.01 0C5.4 0 .06 5.34.06 11.95c0 2.1.55 4.15 1.6 5.96L0 24l6.25-1.64a11.89 11.89 0 005.76 1.47h.01c6.61 0 11.95-5.34 11.95-11.95 0-3.2-1.25-6.2-3.45-8.4zM12.02 22a9.9 9.9 0 01-5.05-1.39l-.36-.21-3.72.98.99-3.63-.24-.37A9.93 9.93 0 012.1 12C2.1 6.98 6.99 2.1 12 2.1c2.63 0 5.1 1.03 6.96 2.9a9.81 9.81 0 012.88 6.98c0 5.02-4.89 9.9-9.82 9.9zm5.7-7.43c-.31-.16-1.83-.9-2.12-1.01-.28-.1-.49-.16-.7.16-.2.31-.8 1.01-.98 1.22-.18.2-.36.23-.67.08-.31-.16-1.32-.49-2.52-1.56-.93-.82-1.55-1.83-1.73-2.14-.18-.31-.02-.48.13-.64.14-.14.31-.36.47-.54.16-.18.2-.31.31-.52.1-.2.05-.39-.02-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.5-.51-.7-.52l-.6-.01c-.2 0-.52.07-.79.39-.27.31-1.03 1-.99 2.45.05 1.45 1.06 2.85 1.21 3.05.16.2 2.09 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.83-.75 2.09-1.47.26-.72.26-1.34.18-1.47-.07-.13-.26-.21-.57-.36z"/>
            </svg>
            <span className="text-sm sm:text-base">WhatsApp: 55 11 97030-7000</span>
          </a>
        </div>
      </footer>
    </div>
  );
};