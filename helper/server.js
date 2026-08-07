const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 48123;

const server = http.createServer((req, res) => {
  // Set CORS headers so web browsers (Firefox, Chrome, Safari) can call this local service
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', helper: 'Holistor Local Helper Service', port: PORT }));
    return;
  }

  // Export endpoint
  if (req.method === 'POST' && req.url === '/v1/export') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { targetPath, files } = payload;

        if (!targetPath || !Array.isArray(files)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing targetPath or files array' }));
          return;
        }

        console.log(`\n[LOCAL HELPER] Request received to write ${files.length} CSV files.`);
        console.log(`[LOCAL HELPER] Target Directory: ${targetPath}`);

        // Ensure target directory exists on physical disk
        fs.mkdirSync(targetPath, { recursive: true });

        // Write each CSV file directly to the physical disk path
        const written = [];
        files.forEach(f => {
          const filePath = path.join(targetPath, f.filename);
          fs.writeFileSync(filePath, f.content, 'utf8');
          written.push(filePath);
          console.log(`  -> Physical file written: ${filePath}`);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Successfully written ${written.length} files directly to target directory.`,
          targetPath,
          writtenFiles: written
        }));
      } catch (err) {
        console.error('[LOCAL HELPER ERROR]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`⚡ HOLISTOR LOCAL HELPER SERVICE IS NOW RUNNING ON MAC`);
  console.log(`📍 Listening on: http://127.0.0.1:${PORT}`);
  console.log(`✅ Direct Local File Writing Enabled for Firefox, Safari & Chrome!`);
  console.log(`=======================================================`);
});
