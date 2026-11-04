/*
Cloudflare Worker — Pyllo Code
Configure os Secrets/Variables:
GITHUB_OWNER = seu usuário GitHub
GITHUB_REPO = nome do repositório
GITHUB_BRANCH = main
GITHUB_TOKEN = token com acesso Contents: Read and write
ADMIN_KEY = senha longa para operações administrativas
*/
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function github(path, options, env) {
  return fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Pyllo-Code",
        ...(options?.headers || {})
      }
    }
  );
}

function validName(name) {
  return typeof name === "string" &&
    /^[a-zA-Z0-9._-]{1,80}$/.test(name) &&
    name !== "." && name !== "..";
}

function rawUrl(env, branch, name) {
  return `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${branch}/scripts/${encodeURIComponent(name)}`;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (!env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_TOKEN) {
      return json({ error: "O Worker ainda não foi configurado com os dados do GitHub." }, 500);
    }

    const url = new URL(request.url);
    const branch = env.GITHUB_BRANCH || "main";
    const folder = "scripts";

    if (url.pathname === "/api/files" && request.method === "GET") {
      const response = await github(`${folder}?ref=${encodeURIComponent(branch)}`, {}, env);
      if (response.status === 404) return json([]);
      if (!response.ok) return json({ error: "Erro ao consultar o GitHub." }, 500);

      const files = await response.json();
      return json(files
        .filter(file => file.type === "file")
        .map(file => ({
          name: file.name,
          rawUrl: rawUrl(env, branch, file.name)
        })));
    }

    if (url.pathname === "/api/publish" && request.method === "POST") {
      try {
        const data = await request.json();
        const filename = data.filename;
        const code = data.code;

        if (!validName(filename)) return json({ error: "Nome de arquivo inválido." }, 400);
        if (typeof code !== "string" || !code.trim() || code.length > 1500000) {
          return json({ error: "Código vazio ou maior que o limite permitido." }, 400);
        }

        const path = `${folder}/${filename}`;
        const existing = await github(`${path}?ref=${encodeURIComponent(branch)}`, {}, env);
        let sha;

        if (existing.ok) {
          const previous = await existing.json();
          sha = previous.sha;
        } else if (existing.status !== 404) {
          return json({ error: "Não foi possível verificar o arquivo no GitHub." }, 500);
        }

        const payload = {
          message: `Publicar ${filename} pelo Pyllo Code`,
          content: base64Utf8(code),
          branch
        };
        if (sha) payload.sha = sha;

        const saved = await github(path, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, env);

        if (!saved.ok) return json({ error: "O GitHub recusou a publicação. Confira o token e a branch." }, 500);

        return json({
          success: true,
          filename,
          rawUrl: rawUrl(env, branch, filename)
        });
      } catch {
        return json({ error: "Erro ao publicar o arquivo." }, 500);
      }
    }

    if (url.pathname === "/api/delete" && request.method === "DELETE") {
      if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
        return json({ error: "Acesso administrativo não autorizado." }, 403);
      }

      try {
        const data = await request.json();
        const filename = data.filename;
        if (!validName(filename)) return json({ error: "Nome inválido." }, 400);

        const path = `${folder}/${filename}`;
        const existing = await github(`${path}?ref=${encodeURIComponent(branch)}`, {}, env);
        if (!existing.ok) return json({ error: "Arquivo não encontrado." }, 404);

        const file = await existing.json();
        const deleted = await github(path, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Excluir ${filename} pelo Pyllo Code`,
            sha: file.sha,
            branch
          })
        }, env);

        if (!deleted.ok) return json({ error: "Não foi possível excluir o arquivo." }, 500);
        return json({ success: true });
      } catch {
        return json({ error: "Erro ao excluir arquivo." }, 500);
      }
    }

    return json({ error: "Rota não encontrada." }, 404);
  }
};
