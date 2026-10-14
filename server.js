const express = require('express');
const QRCode = require('qrcode');
const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL: Middleware to parse incoming JSON payloads
app.use(express.json());
app.use(express.static('public'));

let names = [];
let clients = [];
let sceneState = { state: 'collecting' }; // 'collecting', 'zoom', 'title'

// SSE endpoint for live screen sync
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

// QR Code generation endpoint for display.html
app.get('/api/qr', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const submitUrl = `${protocol}://${host}/submit.html`;
    
    const qrDataUrl = await QRCode.toDataURL(submitUrl, {
      margin: 2,
      color: {
        dark: '#040914',
        light: '#ffffff'
      }
    });
    
    res.json({ qr: qrDataUrl });
  } catch (err) {
    console.error('Error generating QR code:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// POST endpoint for name submissions
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
    console.error('Error handling POST /api/names:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`TAM 80th Server running on port ${PORT}`);
});
