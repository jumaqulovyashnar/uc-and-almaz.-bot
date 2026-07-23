export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-telegram-init-data, authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const rawUrl = req.url || '';
    // Forward directly to EC2 server IP port 80
    const targetUrl = `http://51.21.200.5${rawUrl}`;

    const headers = {};
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    if (req.headers['x-telegram-init-data']) headers['x-telegram-init-data'] = req.headers['x-telegram-init-data'];
    if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseText = await backendRes.text();
    res.setHeader('Content-Type', backendRes.headers.get('content-type') || 'application/json');
    res.status(backendRes.status).send(responseText);
  } catch (error) {
    console.error('Vercel API Proxy Error:', error);
    res.status(500).json({ error: 'Backend Proxy Error', message: error.message });
  }
}
