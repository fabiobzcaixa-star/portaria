import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessageRequest {
  to: string;
  message: string;
  type: 'delivery' | 'withdrawal';
  deliveryData?: {
    codigo: string;
    morador: string;
    apartamento: string;
    bloco?: string;
    observacoes?: string;
    foto_url?: string;  // ✅ URL da imagem
    data?: string;
    hora?: string;
    condominio?: string;
  };
  withdrawalData?: {
    codigo: string;
    morador: string;
    apartamento: string;
    bloco?: string;
    descricao?: string;
    foto_url?: string;  // ✅ URL da imagem
    data: string;
    hora: string;
    condominio?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, type, deliveryData, withdrawalData }: WhatsAppMessageRequest = await req.json();

    console.log('=== WHATSAPP MESSAGE RECEIVED ===');
    console.log('To:', to);
    console.log('Type:', type);
    console.log('DeliveryData:', JSON.stringify(deliveryData, null, 2));
    console.log('WithdrawalData:', JSON.stringify(withdrawalData, null, 2));

    // Send to n8n webhook
    const webhookUrl = 'https://webhook.fbzia.com.br/webhook/portariainteligente';
    
    const webhookPayload = {
      to: to,
      message: message,
      type: type,
      deliveryData: deliveryData,
      withdrawalData: withdrawalData,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== SENDING TO WEBHOOK ===');
    console.log('URL:', webhookUrl);
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('=== WEBHOOK RESPONSE ===');
    console.log('Status:', webhookResponse.status);
    console.log('Status Text:', webhookResponse.statusText);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook Error Response:', errorText);
      throw new Error(`Webhook failed with status: ${webhookResponse.status} - ${errorText}`);
    }

    const result = await webhookResponse.json();
    console.log('✅ WhatsApp message sent successfully:', result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'WhatsApp message sent successfully',
      result: result 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-whatsapp-message function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);