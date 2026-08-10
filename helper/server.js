const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

  // Native OS Folder Picker endpoint for web demo
  if (req.method === 'GET' && req.url === '/v1/pick-folder') {
    console.log(`\n[LOCAL HELPER] Invoking Native OS Folder Picker Dialog...`);
    const isWin = process.platform === 'win32';
    const cmd = isWin
      ? `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }"`
      : `osascript -e 'POSIX path of (choose folder with prompt "Seleccionar ubicación de la vía de la empresa:")'`;

    exec(cmd, (err, stdout, stderr) => {
      if (err || !stdout || !stdout.trim()) {
        console.log(`[LOCAL HELPER] Folder selection cancelled or empty.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Cancelled' }));
        return;
      }

      let rawPath = stdout.trim();
      // Remove trailing slash if present for clean display
      if (rawPath.length > 1 && (rawPath.endsWith('/') || rawPath.endsWith('\\'))) {
        rawPath = rawPath.slice(0, -1);
      }

      console.log(`[LOCAL HELPER] Native OS Folder Picker returned Raw Absolute Path: "${rawPath}"`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, rawPath }));
    });
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
