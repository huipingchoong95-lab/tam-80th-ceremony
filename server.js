// Bulk seed endpoint for placeholder generator (prevents lagging)
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
