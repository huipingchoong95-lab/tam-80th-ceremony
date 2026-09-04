const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '2026';

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let names = [];
let sceneState = { state: 'collecting', payload: null };

// BEFORE:
if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    names = saved.names || [];
    sceneState = saved.sceneState || sceneState; // <-- This was restoring 'title' state on restart
  } catch (err) {
    console.error('Could not read saved state, starting fresh:', err.message);
  }
}

// AFTER (FIX):
if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    names = saved.names || [];
    // Force new server starts/restarts back to collecting state:
    sceneState = { state: 'collecting', payload: null }; 
  } catch (err) {
    console.error('Could not read saved state, starting fresh:', err.message);
  }
}

function persist() {
  fs.writeFile(DATA_FILE, JSON.stringify({ names, sceneState }), (err) => {
    if (err) console.error('Failed to save state:', err.message);
  });
}

const clients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// QR Code API Endpoint
app.get('/api/qr', async (req, res) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const submitUrl = `${protocol}://${host}/submit.html`;

  try {
    const qrDataUrl = await QRCode.toDataURL(submitUrl, {
      margin: 2,
      color: { dark: '#0b1420', light: '#ffffff' }
    });
    res.json({ url: submitUrl, qr: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  res.write(`event: sync\ndata: ${JSON.stringify({ names, sceneState })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

app.post('/api/submit', (req, res) => {
  const raw = ((req.body && req.body.name) || '').trim();
  if (!raw) return res.status(400).json({ error: 'Please enter a name.' });
  if (raw.length > 40) return res.status(400).json({ error: 'Name is too long.' });

  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    name: raw,
    ts: Date.now(),
    hidden: false,
  };
  names.push(entry);
  persist();
  broadcast('name:new', entry);
  res.json({ ok: true });
});

function checkPin(req, res) {
  if (!req.body || req.body.pin !== ADMIN_PIN) {
    res.status(403).json({ error: 'Incorrect PIN.' });
    return false;
  }
  return true;
}

app.post('/api/admin/hide', (req, res) => {
  if (!checkPin(req, res)) return;
  const { id } = req.body;
  const entry = names.find((n) => n.id === id);
  if (!entry) return res.status(404).json({ error: 'Name not found.' });
  entry.hidden = true;
  persist();
  broadcast('name:hidden', { id });
  res.json({ ok: true });
});

app.post('/api/admin/scene', (req, res) => {
  if (!checkPin(req, res)) return;
  const { state, payload } = req.body;
  console.log('[admin/scene] state=%s payload=%o', state, payload);

  if (state === 'reset') {
    names = [];
    sceneState = { state: 'collecting', payload: null };
    persist();
    broadcast('name:reset', {});
    return res.json({ ok: true });
  }

  if (state === 'zoom' && payload && payload.name) {
    const existing = names.find(
      (n) => n.name.toLowerCase() === payload.name.toLowerCase() && !n.hidden
    );
    if (existing) {
      // BUG FIX: this used to do nothing when the name already existed (e.g.
      // an attendee happened to submit the same name before "zoom" was
      // clicked). That left the entry with featured:false forever, which is
      // exactly why it showed up in a random grid slot at a tiny size instead
      // of centered — the display was never told it was the featured one.
      // Now we upgrade the existing entry in place and tell every connected
      // client about it.
      if (!existing.featured) {
        existing.featured = true;
        persist();
        console.log('[admin/scene:zoom] upgraded existing name to featured:', existing);
        broadcast('name:updated', existing);
      }
    } else {
      const entry = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        name: payload.name,
        ts: Date.now(),
        hidden: false,
        featured: true,
      };
      names.push(entry);
      persist();
      console.log('[admin/scene:zoom] created new featured entry:', entry);
      broadcast('name:new', entry);
    }
  }

  sceneState = { state, payload: payload || null };
  persist();
  broadcast('scene:change', sceneState);
  res.json({ ok: true });
});

app.get('/api/admin/names', (req, res) => {
  if (req.query.pin !== ADMIN_PIN) return res.status(403).json({ error: 'Incorrect PIN.' });
  res.json({ names });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});