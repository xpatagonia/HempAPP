export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const resendKey = (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    ''
  ).trim();

  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://vkfgxbsomxzirdezwrxz.supabase.co'
  ).trim();

  const senderEmail = (
    process.env.RESEND_FROM_EMAIL ||
    'notificaciones@hempc.com.ar'
  ).trim();

  const resendConfigured = Boolean(resendKey);

  return res.status(200).json({
    service: 'hempc-vercel-resend-dispatcher',
    architecture: 'vercel_resend_supabase_iot_render',
    platform: 'vercel_serverless',
    provider: resendConfigured ? 'vercel_resend' : 'pending_resend_key',
    resend_configured: resendConfigured,
    supabase_configured: Boolean(supabaseUrl),
    supabase_project: 'vkfgxbsomxzirdezwrxz',
    iot_ai_engine: 'https://hempapp.onrender.com',
    sender: senderEmail,
    host: 'api.resend.com (Vercel Serverless HTTPS:443)',
    port: 443
  });
}
