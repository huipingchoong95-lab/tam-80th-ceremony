const express = require('express');
const QRCode = require('qrcode');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let names = [];
let clients = [];
let sceneState = { state: 'collecting', payload: null };

// Server-Sent Events (SSE) endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);
  res.write(`event: sync\ndata: ${JSON.stringify({ names, sceneState })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcast(event, data) {
  clients.forEach(c => c.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

// QR Code generation endpoint
app.get('/api/qr', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const submitUrl = `${protocol}://${host}/submit.html`;
    
    const qrDataUrl = await QRCode.toDataURL(submitUrl, {
      margin: 2,
      color: { dark: '#040914', light: '#ffffff' }
    });
    
    res.json({ qr: qrDataUrl });
  } catch (err) {
    console.error('QR Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Admin PIN Authentication Route (PIN: 2026)
app.post('/api/admin/auth', (req, res) => {
  const body = req.body || {};
  const pinInput = String(body.passcode || body.pin || body.password || '').trim();

  if (pinInput === '2026') {
    return res.json({ success: true, token: 'authenticated' });
  }

  return res.status(401).json({ success: false, error: 'Incorrect PIN' });
});

// Scene control endpoint
app.post('/api/scene', (req, res) => {
  const { state, payload } = req.body || {};
  if (state) {
    sceneState = { state, payload: payload || null };
    broadcast('scene:change', sceneState);
    return res.json({ success: true, sceneState });
  }
  res.status(400).json({ error: 'Invalid scene state' });
});

// Name submission endpoint
app.post('/api/names', (req, res) => {
  try {
    const { name, featured } = req.body || {};
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Valid name is required.' });
    }

    const newEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      featured: !!featured,
      hidden: false
    };

    names.push(newEntry);
    broadcast('name:new', newEntry);

    return res.status(201).json(newEntry);
  } catch (err) {
    console.error('Name Submission Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Bulk seed endpoint for placeholder generator
app.post('/api/names/seed', (req, res) => {
  const { count } = req.body || {};
  const sampleNames = [
    "Ir. Tan Eng Tat", "Ts. Teh Seng Khoon", "Engr. Lim Chee Keong", "Ts. Dr. Karen Wong", 
    "Ir. Chong Wei Ming", "Ts. Alvin Lee", "Engr. David Ooi", "Ts. Bernard Tan", 
    "Ir. Khor Swee Heng", "Ts. Grace Chew", "Ts. Chan May Ling", "Ir. Saravanan A/L Raman"
  ];
  const addedEntries = [];
  const num = Math.min(parseInt(count, 10) || 5, 20);
  
  for (let i = 0; i < num; i++) {
    const name = sampleNames[Math.floor(Math.random() * sampleNames.length)] + (Math.random() > 0.5 ? ` ${Math.floor(Math.random()*80+10)}` : '');
    const newEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7) + i,
      name: name.trim(),
      featured: false,
      hidden: false
    };
    names.push(newEntry);
    addedEntries.push(newEntry);
  }
  
  broadcast('names:batch', addedEntries);
  return res.status(201).json({ success: true, added: addedEntries });
});

// Delete name moderation endpoint
app.post('/api/names/:id/delete', (req, res) => {
  const { id } = req.params;
  names = names.filter(n => n.id !== id);
  broadcast('name:deleted', { id });
  return res.json({ success: true });
});

// Reset wall endpoint
app.post('/api/reset', (req, res) => {
  names = [];
  sceneState = { state: 'collecting', payload: null };
  broadcast('name:reset', {});
  broadcast('scene:change', sceneState);
  return res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`TAM 80th Server running on port ${PORT}`);
});
