const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL: Middleware to parse incoming JSON payloads
app.use(express.json());
app.use(express.static('public'));

let names = [];
let clients = [];
let sceneState = { state: 'collecting' };

// SSE endpoint for live updates
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
