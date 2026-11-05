const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } }); }
function validFileName(name) { return typeof name === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(name); }
function validFiles(files) { return Array.isArray(files) && files.length > 0 && files.length <= 50 && files.every(f => f && validFileName(f.name) && typeof f.content === "string" && f.content.length <= 1500000); }
function makeId() { const bytes = new Uint8Array(9); crypto.getRandomValues(bytes); return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
export default { async fetch(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/") && env.ASSETS) return env.ASSETS.fetch(request);
  if (!env.SITES) return json({ error: "Armazenamento do site não configurado." }, 500);
  const match = url.pathname.match(/^\/api\/sites\/([a-f0-9]{18})$/);
  if (request.method === "POST" && url.pathname === "/api/sites") {
    try { const data = await request.json(); const name = typeof data.name === "string" ? data.name.trim().slice(0, 80) : "Meu código"; if (!validFiles(data.files)) return json({ error: "Adicione pelo menos um arquivo válido." }, 400); const id = makeId(); const site = { id, name: name || "Meu código", files: data.files, createdAt: new Date().toISOString() }; await env.SITES.put(`site:${id}`, JSON.stringify(site)); return json({ id, name: site.name }); } catch { return json({ error: "Não foi possível salvar o código." }, 400); }
  }
  if (match && request.method === "GET") { const site = await env.SITES.get(`site:${match[1]}`, "json"); return site ? json(site) : json({ error: "Link não encontrado." }, 404); }
  if (match && request.method === "PUT") {
    try { const current = await env.SITES.get(`site:${match[1]}`, "json"); if (!current) return json({ error: "Link não encontrado." }, 404); const data = await request.json(); if (!validFiles(data.files)) return json({ error: "Adicione pelo menos um arquivo válido." }, 400); current.name = typeof data.name === "string" ? data.name.trim().slice(0, 80) || current.name : current.name; current.files = data.files; current.updatedAt = new Date().toISOString(); await env.SITES.put(`site:${match[1]}`, JSON.stringify(current)); return json({ id: current.id, name: current.name }); } catch { return json({ error: "Não foi possível atualizar o código." }, 400); }
  }
  return json({ error: "Rota não encontrada." }, 404);
} };
