// Script de debug completo para testar todos os cenários de webhook

const testScenarios = [
  {
    name: "1. REGISTRO DE MERCADORIA",
    url: "https://webhook.fbzia.com.br/webhook/portariainteligente",
    payload: {
      to: "5511999999999",
      message: "🏢 *Condomínio Teste*\n\n📦 *Nova Encomenda Chegou!*\n\nOlá *João Teste*, você tem uma nova encomenda!\n\n📅 Data: 14/09/2025\n⏰ Hora: 16:30\n🔑 Código de retirada: *12345*\n\nPara retirar, apresente este código na portaria.\n\nNão responda esta mensagem, este é um atendimento automático.",
      type: "delivery",
      deliveryData: {
        codigo: "12345",
        morador: "João Teste",
        apartamento: "1905",
        bloco: "A",
        observacoes: "Teste de registro",
        foto_url: "https://via.placeholder.com/400x300/4f46e5/ffffff?text=Entrega",
        data: "14/09/2025",
        hora: "16:30",
        condominio: "Condomínio Teste"
      }
    }
  },
  {
    name: "2. CONFIRMAÇÃO DE RETIRADA",
    url: "https://webhook.fbzia.com.br/webhook/portariainteligente",
    payload: {
      to: "5511999999999",
      message: "🏢 *Condomínio Teste*\n\n✅ *Encomenda Retirada*\n\nOlá *João Teste*, sua encomenda foi retirada com sucesso!\n\n📅 Data: 14/09/2025\n⏰ Hora: 16:30\n🔑 Código: 12345\n\nNão responda esta mensagem, este é um atendimento automático.",
      type: "withdrawal",
      withdrawalData: {
        codigo: "12345",
        morador: "João Teste",
        apartamento: "1905",
        bloco: "A",
        descricao: "",
        foto_url: "https://via.placeholder.com/400x300/4f46e5/ffffff?text=Entrega",
        data: "14/09/2025",
        hora: "16:30",
        condominio: "Condomínio Teste"
      }
    }
  },
  {
    name: "3. LEMBRETE",
    url: "https://webhook.fbzia.com.br/webhook/portariainteligente",
    payload: {
      to: "5511999999999",
      message: "🏢 *Condomínio Teste*\n\n📦 *Lembrete de Encomenda*\n\nOlá *João Teste*, você tem uma encomenda aguardando retirada na portaria há 2 dias.\n\n🔑 Código: 12345\n🏠 Apartamento: A-1905\n📅 Recebida em: 12/09/2025\n\nPor favor, retire sua encomenda o quanto antes.\n\nNão responda esta mensagem, este é um atendimento automático.",
      type: "reminder",
      reminderData: {
        codigo: "12345",
        morador: "João Teste",
        apartamento: "1905",
        bloco: "A",
        diasPendente: 2,
        condominio: "Condomínio Teste"
      }
    }
  },
  {
    name: "4. TESTE SUPABASE FUNCTION",
    url: "https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message",
    payload: {
      to: "5511999999999",
      message: "🧪 Teste Supabase Function",
      type: "test"
    }
  }
];

const testWebhook = async (scenario) => {
  console.log(`\n🧪 ===== ${scenario.name} =====`);
  console.log('🔗 URL:', scenario.url);
  console.log('📤 Payload:', JSON.stringify(scenario.payload, null, 2));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(scenario.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenario.payload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('⏱️  Tempo resposta:', duration + 'ms');
    console.log('🌐 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      try {
        const result = await response.json();
        console.log('✅ SUCESSO! Resposta:', result);
      } catch (jsonError) {
        const text = await response.text();
        console.log('✅ SUCESSO! Resposta (texto):', text);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ ERRO! Resposta:', errorText);
    }
  } catch (error) {
    console.error('💥 ERRO DE CONEXÃO:', error.message);
    console.error('🔍 Stack:', error.stack);
  }
  
  console.log('─'.repeat(80));
};

const runAllTests = async () => {
  console.log('🚀 INICIANDO TESTES COMPLETOS DE WEBHOOK');
  console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
  console.log('🌐 Total de cenários:', testScenarios.length);
  console.log('='.repeat(80));
  
  for (const scenario of testScenarios) {
    await testWebhook(scenario);
    
    // Aguardar 1 segundo entre testes para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 TODOS OS TESTES CONCLUÍDOS!');
};

// Se está sendo executado no browser
if (typeof window !== 'undefined') {
  window.testAllWebhooks = runAllTests;
  window.testScenarios = testScenarios;
  console.log('🌐 Execute: testAllWebhooks() no console do browser');
  console.log('🌐 Ou execute cenários individuais com: testWebhook(testScenarios[0])');
} else {
  // Se está sendo executado no Node.js
  runAllTests();
}