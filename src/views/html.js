// Monta a página HTML de resposta com os dados de autenticação recebidos.
export function renderHtml(titulo, subtitulo, dados) {
  const entradas = Object.entries(dados);
  const linhas = entradas.length
    ? entradas
        .map(
          ([chave, valor]) =>
            `<tr><td class="chave">${chave}</td><td class="valor">${
              valor === undefined || valor === null || valor === '' ? '<span class="vazio">(vazio)</span>' : String(valor)
            }</td></tr>`
        )
        .join('')
    : '<tr><td colspan="2"><span class="vazio">nenhum dado recebido</span></td></tr>';

  return `<!DOCTYPE html>
          <html lang="pt-br">
          <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${titulo} · Tiqtech</title>
          <style>
            :root { --bg:#0b0f19; --card:#131a2b; --border:#232c42; --text:#e7ebf3; --muted:#97a2bd; --accent:#2f6bff; }
            * { box-sizing: border-box; }
            body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); color:var(--text); font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; padding:24px; }
            .card { width:100%; max-width:720px; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:32px; }
            .brand { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
            .brand .dot { width:10px; height:10px; border-radius:50%; background:var(--accent); }
            .brand span { font-weight:600; letter-spacing:.5px; color:var(--muted); text-transform:uppercase; font-size:13px; }
            h1 { margin:0 0 4px; font-size:22px; }
            p.sub { margin:0 0 24px; color:var(--muted); font-size:14px; }
            table { width:100%; border-collapse:collapse; }
            td { padding:10px 12px; border-bottom:1px solid var(--border); font-size:13px; vertical-align:top; }
            td.chave { color:var(--muted); white-space:nowrap; width:40%; font-family:monospace; }
            td.valor { word-break:break-all; font-family:monospace; }
            .vazio { color:var(--muted); font-style:italic; }
            footer { margin-top:24px; color:var(--muted); font-size:12px; }
          </style>
          </head>
          <body>
            <div class="card">
              <div class="brand"><span class="dot"></span><span>Tiqtech · auth-examples-bitrix24</span></div>
              <h1>${titulo}</h1>
              <p class="sub">${subtitulo}</p>
              <table>${linhas}</table>
              <footer>Gerado em ${new Date().toLocaleString('pt-BR')} — apenas demonstração.</footer>
            </div>
          </body>
          </html>`;
}
