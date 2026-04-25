const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';

function readSkill(name) {
  try {
    return fs.readFileSync(path.join(__dirname, 'skills', name, 'SKILL.md'), 'utf8');
  } catch (e) {
    return '';
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  let codeBuffer = '';
  let codeLang = '';
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuffer = '';
      } else {
        inCode = false;
        html += `<pre><code class="lang-${escapeHtml(codeLang)}">${escapeHtml(codeBuffer)}</code></pre>\n`;
        codeBuffer = '';
      }
      continue;
    }

    if (inCode) {
      codeBuffer += line + '\n';
      continue;
    }

    if (line.startsWith('---') && line.trim() === '---') {
      html += '<hr>\n';
      continue;
    }

    if (line.startsWith('# ')) {
      html += `<h1>${escapeHtml(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${escapeHtml(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${escapeHtml(line.slice(4))}</h3>\n`;
    } else if (line.startsWith('#### ')) {
      html += `<h4>${escapeHtml(line.slice(5))}</h4>\n`;
    } else if (line.startsWith('| ')) {
      if (!inTable) {
        inTable = true;
        html += '<table>\n';
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      const isHeader = lines[i + 1] && lines[i + 1].match(/^\|[\s\-|]+\|$/);
      const isSeparator = line.match(/^\|[\s\-|]+\|$/);
      if (isSeparator) continue;
      const tag = isHeader ? 'th' : 'td';
      html += '<tr>' + cells.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('') + '</tr>\n';
    } else {
      if (inTable) {
        inTable = false;
        html += '</table>\n';
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        html += `<li>${escapeHtml(line.slice(2))}</li>\n`;
      } else if (line.trim() === '') {
        html += '<br>\n';
      } else {
        let processed = escapeHtml(line);
        processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        html += `<p>${processed}</p>\n`;
      }
    }
  }

  if (inTable) html += '</table>\n';

  return html;
}

function buildPage(activeSkill) {
  const skills = [
    { id: 'pinterest-api', label: 'API Reference' },
    { id: 'pinterest-csv', label: 'CSV Formats' },
    { id: 'pinterest-workflows', label: 'Workflow Recipes' },
  ];

  const readmeContent = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');

  let content = '';
  if (!activeSkill || activeSkill === 'readme') {
    content = markdownToHtml(readmeContent);
  } else {
    const skill = skills.find(s => s.id === activeSkill);
    if (skill) {
      content = markdownToHtml(readSkill(skill.id));
    }
  }

  const navItems = skills.map(s => {
    const isActive = s.id === activeSkill;
    return `<a href="/?skill=${s.id}" class="${isActive ? 'active' : ''}">${s.label}</a>`;
  });

  const homeActive = !activeSkill || activeSkill === 'readme';
  const homeLink = `<a href="/" class="${homeActive ? 'active' : ''}">Overview</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pinterest Automation Skills</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #333; line-height: 1.6; }
    header { background: #e60023; color: white; padding: 16px 24px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    header svg { flex-shrink: 0; }
    header h1 { font-size: 1.4rem; font-weight: 700; }
    header p { font-size: 0.85rem; opacity: 0.85; }
    nav { background: white; border-bottom: 1px solid #e0e0e0; padding: 0 24px; display: flex; gap: 0; overflow-x: auto; }
    nav a { display: block; padding: 14px 20px; text-decoration: none; color: #555; font-size: 0.9rem; font-weight: 500; border-bottom: 3px solid transparent; white-space: nowrap; transition: all 0.15s; }
    nav a:hover { color: #e60023; background: #fff5f5; }
    nav a.active { color: #e60023; border-bottom-color: #e60023; }
    .container { max-width: 960px; margin: 32px auto; padding: 0 24px; }
    .card { background: white; border-radius: 8px; padding: 32px 40px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    h1 { font-size: 2rem; color: #222; margin-bottom: 16px; margin-top: 24px; }
    h2 { font-size: 1.4rem; color: #333; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    h3 { font-size: 1.15rem; color: #444; margin-top: 24px; margin-bottom: 8px; }
    h4 { font-size: 1rem; color: #555; margin-top: 16px; margin-bottom: 6px; }
    p { margin-bottom: 12px; color: #444; }
    pre { background: #1e1e2e; color: #cdd6f4; border-radius: 6px; padding: 16px; overflow-x: auto; margin: 12px 0; font-size: 0.82rem; line-height: 1.5; }
    code { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }
    p code, li code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.85em; color: #c7254e; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.88rem; }
    th { background: #f5f5f5; font-weight: 600; text-align: left; padding: 10px 14px; border: 1px solid #e0e0e0; color: #333; }
    td { padding: 9px 14px; border: 1px solid #e8e8e8; color: #444; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    li { margin: 4px 0 4px 24px; color: #444; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    a { color: #e60023; }
    a:hover { text-decoration: underline; }
    .badge { display: inline-block; background: #fff0f0; color: #e60023; border: 1px solid #ffd0d0; border-radius: 4px; font-size: 0.75rem; padding: 2px 8px; font-weight: 600; margin-bottom: 24px; }
  </style>
</head>
<body>
  <header>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
    <div>
      <h1>Pinterest Automation Skills</h1>
      <p>AI agent skills for the Pinterest Automation Dashboard</p>
    </div>
  </header>
  <nav>
    ${homeLink}
    ${navItems.join('\n    ')}
  </nav>
  <div class="container">
    <div class="card">
      ${content}
    </div>
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const skill = url.searchParams.get('skill') || 'readme';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(buildPage(skill));
});

server.listen(PORT, HOST, () => {
  console.log(`Pinterest Automation Skills server running at http://${HOST}:${PORT}`);
});
