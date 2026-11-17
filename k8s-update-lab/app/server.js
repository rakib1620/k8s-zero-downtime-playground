const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 8080;
const APP_VERSION = process.env.APP_VERSION || 'v1.0.0';
const BG_COLOR = process.env.BG_COLOR || '#2563eb'; // blue for v1, green for v2, red for v3
const POD_NAME = process.env.POD_NAME || os.hostname();
const POD_IP = process.env.POD_IP || '127.0.0.1';
const NODE_NAME = process.env.NODE_NAME || 'local-node';

let isHealthy = true;
let requestCount = 0;
const startTime = Date.now();

const server = http.createServer((req, res) => {
  requestCount++;

  // 1. JSON API endpoint for automated test scripts & polling
  if (req.url === '/api/info') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      version: APP_VERSION,
      podName: POD_NAME,
      podIp: POD_IP,
      nodeName: NODE_NAME,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      requestCount: requestCount,
      timestamp: new Date().toISOString()
    }));
  }

  // 2. Health check endpoint (Readiness & Liveness probes)
  if (req.url === '/healthz') {
    if (isHealthy) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('OK\n');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('UNHEALTHY (simulated failure)\n');
    }
  }

  // 3. Simulated failure toggle
  if (req.url === '/toggle-health') {
    isHealthy = !isHealthy;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(`Health status changed. isHealthy = ${isHealthy}\n`);
  }

  // 4. Crash simulation
  if (req.url === '/kill') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Process exiting in 1 second...\n');
    setTimeout(() => {
      console.log('Crash requested via /kill. Exiting...');
      process.exit(1);
    }, 1000);
    return;
  }

  // 5. Visual Web Dashboard
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kubernetes Rolling Update Demo - ${APP_VERSION}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 800px;
      width: 100%;
    }
    .card {
      background: #1e293b;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      border: 1px solid #334155;
      margin-bottom: 1.5rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #334155;
      padding-bottom: 1rem;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
      background-color: ${BG_COLOR};
      box-shadow: 0 0 15px ${BG_COLOR}88;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-box {
      background: #0f172a;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;
    }
    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.1rem;
      font-weight: 600;
      word-break: break-all;
      color: #38bdf8;
    }
    .pulse {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      margin-right: 6px;
      animation: blink 1.5s infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
    }
    .live-feed {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: monospace;
      font-size: 0.85rem;
      max-height: 250px;
      overflow-y: auto;
    }
    .log-entry {
      padding: 0.25rem 0;
      border-bottom: 1px dashed #1e293b;
      display: flex;
      justify-content: space-between;
    }
    .log-v1 { color: #60a5fa; }
    .log-v2 { color: #4ade80; }
    .actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .btn {
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.85rem;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #475569; }
    .btn-danger { background: #b91c1c; }
    .btn-danger:hover { background: #dc2626; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div>
          <div class="title"><span class="pulse"></span>Kubernetes Update Lab</div>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 4px;">Live Rolling Update & Pod Resilience Demo</p>
        </div>
        <div class="badge" id="appVersion">${APP_VERSION}</div>
      </div>

      <div class="grid">
        <div class="stat-box">
          <div class="stat-label">Serving Pod</div>
          <div class="stat-value" id="podName">${POD_NAME}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Pod IP</div>
          <div class="stat-value" id="podIp">${POD_IP}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Cluster Node</div>
          <div class="stat-value" id="nodeName">${NODE_NAME}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Requests</div>
          <div class="stat-value" id="reqCount">${requestCount}</div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" onclick="fetchInfo()">🔄 Refresh Now</button>
        <a class="btn" href="/healthz" target="_blank">🩺 Check Healthz</a>
        <a class="btn" href="/toggle-health" target="_blank">⚠️ Toggle Healthy/Unhealthy</a>
        <a class="btn btn-danger" href="/kill" target="_blank">💥 Crash Pod (/kill)</a>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom: 0.75rem; font-size: 1.1rem; display: flex; justify-content: space-between;">
        <span>Live Request Feed (Polling every 800ms)</span>
        <span id="pollStatus" style="font-size: 0.8rem; color: #22c55e;">● Active</span>
      </h3>
      <div class="live-feed" id="liveLogs">
        <div class="log-entry">
          <span>[Initial Load] Connected to pod <strong>${POD_NAME}</strong></span>
          <span>${APP_VERSION}</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const logsEl = document.getElementById('liveLogs');
    const versionEl = document.getElementById('appVersion');
    const podEl = document.getElementById('podName');
    const ipEl = document.getElementById('podIp');
    const countEl = document.getElementById('reqCount');

    async function fetchInfo() {
      try {
        const res = await fetch('/api/info');
        const data = await res.json();
        
        versionEl.textContent = data.version;
        podEl.textContent = data.podName;
        ipEl.textContent = data.podIp;
        countEl.textContent = data.requestCount;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const isV1 = data.version.includes('v1');
        const verColor = isV1 ? 'log-v1' : 'log-v2';
        
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = '<span>[' + time + '] Pod: <b>' + data.podName + '</b></span>' +
                          '<span class="' + verColor + '"><b>' + data.version + '</b></span>';
        
        logsEl.insertBefore(entry, logsEl.firstChild);
        if (logsEl.children.length > 30) {
          logsEl.removeChild(logsEl.lastChild);
        }
      } catch (err) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = '<span style="color: #ef4444;">[' + new Date().toLocaleTimeString() + '] ⚠️ Connection Dropped / Pod Restarting...</span><span style="color: #ef4444;">DOWN</span>';
        logsEl.insertBefore(entry, logsEl.firstChild);
      }
    }

    setInterval(fetchInfo, 800);
  </script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${APP_VERSION}] Server running on port ${PORT} on pod ${POD_NAME}`);
});
