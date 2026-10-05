// Servidor de vista previa local, sin dependencias. Ctrl+C para detenerlo.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const port = Number(process.env.PORT || 4174);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm" };
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400); response.end("Solicitud inválida"); return; }
  const filename = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  const relative = path.relative(root, filename);
  if (relative.startsWith("..") || path.isAbsolute(relative)) { response.writeHead(403); response.end(); return; }
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404); response.end("No encontrado"); return; }
    const headers = { "Content-Type": types[path.extname(filename)] || "application/octet-stream", "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
    let start = 0, end = stat.size - 1, status = 200;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) { response.writeHead(416, {"Content-Range": `bytes */${stat.size}`}); response.end(); return; }
      start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= stat.size) { response.writeHead(416, {"Content-Range": `bytes */${stat.size}`}); response.end(); return; }
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers["Content-Length"] = Math.max(0, end - start + 1);
    response.writeHead(status, headers);
    if (request.method === "HEAD" || stat.size === 0) { response.end(); return; }
    const stream = fs.createReadStream(filename, {start, end});
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
}).listen(port, "127.0.0.1", () => console.log(`Plantilla predeterminada disponible en http://127.0.0.1:${port}`));
