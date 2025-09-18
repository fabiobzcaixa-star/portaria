// TESTE FINAL - Verificação de URLs corretas em todos os componentes

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO URLs DE WEBHOOK EM TODOS OS COMPONENTES...\n');

const files = [
  'src/components/SimpleDeliveryForm.tsx',
  'src/components/WithdrawalPanel.tsx', 
  'src/components/RemindersPanel.tsx',
  'supabase/functions/send-whatsapp-message/index.ts'
];

const correctWebhookUrl = 'https://webhook.fbzia.com.br/webhook/portariainteligente';
const supabaseUrl = 'https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message';

let allCorrect = true;

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  console.log(`📄 Verificando: ${file}`);
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar se contém a URL correta do webhook
    const hasCorrectWebhook = content.includes(correctWebhookUrl);
    
    // Verificar URLs antigas/incorretas
    const hasOldUrl1 = content.includes('https://n8n-webhook.xdc7yi.easypanel.host');
    const hasOldUrl2 = content.includes('n8n-webhook');
    
    console.log(`   ✅ URL correta webhook: ${hasCorrectWebhook ? 'SIM' : 'NÃO'}`);
    console.log(`   ❌ URL antiga encontrada: ${hasOldUrl1 || hasOldUrl2 ? 'SIM' : 'NÃO'}`);
    
    if (file.includes('supabase/functions')) {
      console.log(`   📞 Supabase Function: ${content.includes('webhookUrl') ? 'OK' : 'PROBLEMA'}`);
    } else {
      // Para componentes React, verificar se tem webhook direto primeiro
      const webhookDirectIndex = content.indexOf(correctWebhookUrl);
      const supabaseIndex = content.indexOf(supabaseUrl);
      
      if (webhookDirectIndex !== -1 && supabaseIndex !== -1) {
        const webhookFirst = webhookDirectIndex < supabaseIndex;
        console.log(`   🚀 Webhook direto primeiro: ${webhookFirst ? 'SIM' : 'NÃO'}`);
        if (!webhookFirst) allCorrect = false;
      }
    }
    
    if (!hasCorrectWebhook || hasOldUrl1 || hasOldUrl2) {
      allCorrect = false;
    }
    
  } catch (error) {
    console.log(`   ❌ ERRO ao ler arquivo: ${error.message}`);
    allCorrect = false;
  }
  
  console.log('');
});

console.log('📊 RESULTADO FINAL:');
console.log('==================');
if (allCorrect) {
  console.log('✅ TODOS OS ARQUIVOS ESTÃO CORRETOS!');
  console.log('✅ URLs atualizadas com sucesso');
  console.log('✅ Estratégia webhook-first implementada');
  console.log('\n🎉 SISTEMA PRONTO PARA USO!');
} else {
  console.log('❌ ALGUNS ARQUIVOS PRECISAM DE CORREÇÃO');
  console.log('❌ Verifique os detalhes acima');
}

// Testar webhook novamente para confirmar
console.log('\n🧪 TESTE RÁPIDO DO WEBHOOK...');
const testPayload = {
  to: "5511999999999",
  message: "🧪 Teste pós-correção",
  type: "test"
};

fetch(correctWebhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload)
})
.then(response => {
  console.log(`📊 Status: ${response.status}`);
  if (response.ok) {
    return response.json();
  } else {
    throw new Error(`Status ${response.status}`);
  }
})
.then(result => {
  console.log('✅ Webhook funcionando:', result);
})
.catch(error => {
  console.log('❌ Webhook com problema:', error.message);
});