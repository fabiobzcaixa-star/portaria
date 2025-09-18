import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

// Tipo para o evento beforeinstallprompt que não está definido no TypeScript padrão
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Verifica se o app já está instalado
  useEffect(() => {
    console.log('InstallPWA: Inicializando verificação');
    
    // Navegador suporta instalação via display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('InstallPWA: App já está instalado (display-mode: standalone)');
      setIsInstalled(true);
      return;
    }

    // iOS com app instalado via Add to Home Screen
    if ('standalone' in navigator && (navigator as any).standalone === true) {
      console.log('InstallPWA: App já está instalado (iOS standalone)');
      setIsInstalled(true);
      return;
    }

    // Captura o evento beforeinstallprompt para usar mais tarde
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('InstallPWA: Evento beforeinstallprompt capturado');
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Detecta quando o app é instalado
    window.addEventListener('appinstalled', () => {
      console.log('InstallPWA: App foi instalado');
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowButton(false);
    });

    // Em ambiente de desenvolvimento, mostra o botão mesmo sem o evento
    // Isso é útil para testar a UI
    if (import.meta.env.DEV) {
      console.log('InstallPWA: Ambiente de desenvolvimento, mostrando botão para testes');
      setTimeout(() => {
        setShowButton(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('InstallPWA: Botão de instalação clicado');
    
    // Em ambiente de desenvolvimento, apenas mostra um alerta
    if (import.meta.env.DEV && !installPrompt) {
      alert('Em ambiente de desenvolvimento, o botão de instalação aparece para testes, mas não funcionará completamente. Para testar o PWA completo, faça o build e sirva os arquivos.');
      return;
    }
    
    if (!installPrompt) {
      console.log('InstallPWA: Nenhum prompt de instalação disponível');
      return;
    }
    
    // Mostra o prompt de instalação
    console.log('InstallPWA: Mostrando prompt de instalação');
    await installPrompt.prompt();
    
    // Aguarda a escolha do usuário
    const choiceResult = await installPrompt.userChoice;
    console.log('InstallPWA: Resultado da instalação', choiceResult);
    
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
      setIsInstalled(true);
      setShowButton(false);
    } else {
      console.log('Usuário recusou a instalação');
    }
    
    // Limpa o prompt salvo para evitar mostrá-lo novamente
    setInstallPrompt(null);
  };

  // Não mostra o botão se o app já estiver instalado
  if (isInstalled) {
    console.log('InstallPWA: App já está instalado, não mostrando botão');
    return null;
  }
  
  // Não mostra o botão se não estiver em ambiente de desenvolvimento e não tiver o evento
  if (!showButton) {
    console.log('InstallPWA: Não mostrando botão - aguardando evento beforeinstallprompt ou ambiente de desenvolvimento');
    return null;
  }

  console.log('InstallPWA: Mostrando botão de instalação');
  return (
    <Button 
      onClick={handleInstallClick} 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 shadow-lg flex items-center gap-2 bg-primary hover:bg-primary/90"
    >
      <Download className="h-4 w-4" />
      Instalar Aplicativo
    </Button>
  );
};

export default InstallPWA;