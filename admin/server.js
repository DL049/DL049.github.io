const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const PORT = 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, '_posts');
const DRAFTS_DIR = path.join(ROOT_DIR, '_drafts');
const IMG_DIR = path.join(ROOT_DIR, 'assets', 'img', 'posts');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// Jekyll preview process reference
let jekyllProcess = null;

// Helper: Read local config
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading config:', err);
  }
  return {
    githubToken: '',
    repo: 'DL049/DL049.github.io',
    author: 'Delon Lee'
  };
}

// Helper: Save local config
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

// Helper: Parse Frontmatter & Body
function parsePost(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }
  const fmRaw = match[1];
  const content = match[2];
  const frontmatter = {};

  const lines = fmRaw.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    // Strip inline comments if not part of a URL
    if (val.includes(' #') && !val.includes('http')) {
      val = val.split(' #')[0].trim();
    }

    if (val.startsWith('[') && val.endsWith(']')) {
      const items = val
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      frontmatter[key] = items;
    } else if (val.toLowerCase() === 'true') {
      frontmatter[key] = true;
    } else if (val.toLowerCase() === 'false') {
      frontmatter[key] = false;
    } else {
      val = val.replace(/^['"]|['"]$/g, '');
      frontmatter[key] = val;
    }
  }

  return { frontmatter, content };
}

// Helper: Format Frontmatter & Body to Markdown
function formatPost(frontmatter, content) {
  const fmLines = ['---'];
  if (frontmatter.title) fmLines.push(`title: ${frontmatter.title}`);
  if (frontmatter.date) fmLines.push(`date: ${frontmatter.date}`);
  if (frontmatter.description) fmLines.push(`description: ${frontmatter.description}`);

  if (Array.isArray(frontmatter.categories) && frontmatter.categories.length > 0) {
    fmLines.push(`categories: [${frontmatter.categories.join(', ')}]`);
  } else if (typeof frontmatter.categories === 'string' && frontmatter.categories.trim()) {
    fmLines.push(`categories: [${frontmatter.categories.trim()}]`);
  }

  if (Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0) {
    const cleanTags = frontmatter.tags.map(t => t.trim().toLowerCase()).filter(Boolean);
    fmLines.push(`tags: [${cleanTags.join(', ')}]`);
  } else if (typeof frontmatter.tags === 'string' && frontmatter.tags.trim()) {
    const cleanTags = frontmatter.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    fmLines.push(`tags: [${cleanTags.join(', ')}]`);
  }

  fmLines.push(`math: ${frontmatter.math ? 'true' : 'false'}`);
  fmLines.push(`toc: ${frontmatter.toc !== false ? 'true' : 'false'}`);
  fmLines.push('---');

  return fmLines.join('\n') + '\n\n' + (content || '').trim() + '\n';
}

// Helper: Run shell command safely
function runCmd(command, cwd = ROOT_DIR) {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        code: error ? error.code : 0,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : null
      });
    });
  });
}

// Helper: MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// Scan markdown posts in a folder
function scanMarkdownDir(dir, isDraft) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const list = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { frontmatter, content } = parsePost(raw);

      const cleanContent = content.replace(/[#*`_>\[\]]/g, '').trim();
      const excerpt = cleanContent.slice(0, 150) + (cleanContent.length > 150 ? '...' : '');

      list.push({
        filename: file,
        isDraft,
        title: frontmatter.title || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
        date: frontmatter.date || '',
        categories: frontmatter.categories || [],
        tags: frontmatter.tags || [],
        math: !!frontmatter.math,
        toc: frontmatter.toc !== false,
        description: frontmatter.description || '',
        excerpt,
        mtime: stat.mtime
      });
    } catch (e) {
      console.error(`Error scanning ${file}:`, e);
    }
  }
  return list;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // JSON Body Helper (Supports up to 25MB for base64 images)
  const getBody = () => new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });

  // Response JSON Helper
  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify(data));
  };

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. List Posts (Both Published and Drafts)
  if (method === 'GET' && pathname === '/api/posts') {
    try {
      const publishedPosts = scanMarkdownDir(POSTS_DIR, false);
      const draftPosts = scanMarkdownDir(DRAFTS_DIR, true);
      const allPosts = [...publishedPosts, ...draftPosts];

      // Sort by date or filename descending
      allPosts.sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date);
        return b.filename.localeCompare(a.filename);
      });

      return json({
        success: true,
        posts: allPosts,
        stats: {
          total: allPosts.length,
          published: publishedPosts.length,
          drafts: draftPosts.length
        }
      });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  // 2. Get Single Post
  if (method === 'GET' && pathname.startsWith('/api/posts/')) {
    const filename = decodeURIComponent(pathname.replace('/api/posts/', ''));
    let filePath = path.join(POSTS_DIR, filename);
    let isDraft = false;

    if (!fs.existsSync(filePath)) {
      filePath = path.join(DRAFTS_DIR, filename);
      isDraft = true;
    }

    if (!fs.existsSync(filePath)) {
      return json({ success: false, error: '文章不存在' }, 404);
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { frontmatter, content } = parsePost(raw);
      return json({ success: true, post: { filename, isDraft, frontmatter, content } });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  // 3. Save Post (Create / Update / Move between draft & published)
  if (method === 'POST' && pathname === '/api/posts') {
    try {
      const data = await getBody();
      let { originalFilename, filename, frontmatter, content, isDraft } = data;
      isDraft = !!isDraft;

      if (!filename) {
        return json({ success: false, error: '檔名不能為空' }, 400);
      }

      if (!filename.endsWith('.md')) {
        filename += '.md';
      }

      // If published, ensure standard Jekyll post naming: YYYY-MM-DD-title.md
      if (!isDraft && !/^\d{4}-\d{2}-\d{2}-/.test(filename)) {
        let datePrefix = new Date().toISOString().slice(0, 10);
        if (frontmatter && frontmatter.date) {
          const m = frontmatter.date.match(/^\d{4}-\d{2}-\d{2}/);
          if (m) datePrefix = m[0];
        }
        filename = `${datePrefix}-${filename}`;
      }

      const targetDir = isDraft ? DRAFTS_DIR : POSTS_DIR;
      const targetPath = path.join(targetDir, filename);

      // Handle file relocation or renaming
      if (originalFilename) {
        const oldInPosts = path.join(POSTS_DIR, originalFilename);
        const oldInDrafts = path.join(DRAFTS_DIR, originalFilename);

        if (fs.existsSync(oldInPosts) && oldInPosts !== targetPath) {
          fs.unlinkSync(oldInPosts);
        }
        if (fs.existsSync(oldInDrafts) && oldInDrafts !== targetPath) {
          fs.unlinkSync(oldInDrafts);
        }
      }

      const formatted = formatPost(frontmatter || {}, content || '');
      fs.writeFileSync(targetPath, formatted, 'utf8');

      return json({ success: true, filename, isDraft });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  // 4. Delete Post
  if (method === 'DELETE' && pathname.startsWith('/api/posts/')) {
    const filename = decodeURIComponent(pathname.replace('/api/posts/', ''));
    const postPath = path.join(POSTS_DIR, filename);
    const draftPath = path.join(DRAFTS_DIR, filename);

    try {
      let deleted = false;
      if (fs.existsSync(postPath)) {
        fs.unlinkSync(postPath);
        deleted = true;
      }
      if (fs.existsSync(draftPath)) {
        fs.unlinkSync(draftPath);
        deleted = true;
      }

      if (deleted) {
        return json({ success: true });
      } else {
        return json({ success: false, error: '檔案不存在' }, 404);
      }
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  // 5. Image Upload API (Clipboard paste & file drop)
  if (method === 'POST' && pathname === '/api/upload-image') {
    try {
      const data = await getBody();
      const rawData = data.data || '';
      const origFilename = data.filename || '';

      if (!rawData) {
        return json({ success: false, error: '未提供圖片數據' }, 400);
      }

      // Determine date subfolder YYYYMM
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const targetSubDir = path.join(IMG_DIR, yyyymm);
      if (!fs.existsSync(targetSubDir)) {
        fs.mkdirSync(targetSubDir, { recursive: true });
      }

      // Determine file extension and decode base64
      let ext = '.png';
      let buffer;
      const dataUriMatch = rawData.match(/^data:image\/([a-zA-Z0-9-+.]+);base64,(.+)$/);

      if (dataUriMatch) {
        let type = dataUriMatch[1].toLowerCase();
        if (type === 'jpeg') ext = '.jpg';
        else if (type === 'png') ext = '.png';
        else if (type === 'gif') ext = '.gif';
        else if (type === 'webp') ext = '.webp';
        else if (type === 'svg+xml') ext = '.svg';
        buffer = Buffer.from(dataUriMatch[2], 'base64');
      } else {
        if (origFilename && path.extname(origFilename)) {
          ext = path.extname(origFilename).toLowerCase();
        }
        buffer = Buffer.from(rawData, 'base64');
      }

      // Generate unique safe filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 7);
      const safeFilename = `img_${timestamp}_${randomStr}${ext}`;
      const savePath = path.join(targetSubDir, safeFilename);

      fs.writeFileSync(savePath, buffer);

      const publicUrl = `/assets/img/posts/${yyyymm}/${safeFilename}`;
      return json({
        success: true,
        url: publicUrl,
        filename: safeFilename
      });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  // 6. Config (Get & Save)
  if (method === 'GET' && pathname === '/api/config') {
    const cfg = readConfig();
    return json({
      success: true,
      repo: cfg.repo || 'DL049/DL049.github.io',
      hasToken: !!(cfg.githubToken && cfg.githubToken.trim()),
      maskedToken: cfg.githubToken ? `${cfg.githubToken.slice(0, 4)}••••••••${cfg.githubToken.slice(-4)}` : ''
    });
  }

  if (method === 'POST' && pathname === '/api/config') {
    const data = await getBody();
    const current = readConfig();
    if (data.githubToken !== undefined) {
      current.githubToken = data.githubToken.trim();
    }
    if (data.repo !== undefined) {
      current.repo = data.repo.trim();
    }
    saveConfig(current);
    return json({ success: true });
  }

  // 7. Git Status
  if (method === 'GET' && pathname === '/api/git/status') {
    const statusRes = await runCmd('git status -s');
    const logRes = await runCmd('git log -1 --pretty=format:"%h - %s (%cr)"');
    const branchRes = await runCmd('git branch --show-current');

    return json({
      success: true,
      branch: branchRes.stdout.trim() || 'main',
      hasChanges: statusRes.stdout.trim().length > 0,
      changes: statusRes.stdout.trim(),
      lastCommit: logRes.stdout.trim()
    });
  }

  // 8. Publish to GitHub
  if (method === 'POST' && pathname === '/api/publish') {
    const cfg = readConfig();
    const logs = [];

    // Step 1: git add
    logs.push('[1/3] 正在暫存變更 (git add .)...');
    const addRes = await runCmd('git add .');
    if (!addRes.success) {
      return json({ success: false, error: 'git add 失敗', log: addRes.stderr || addRes.stdout });
    }

    // Step 2: git commit
    logs.push('[2/3] 正在建立 Commit...');
    const statusCheck = await runCmd('git status --porcelain');
    if (statusCheck.stdout.trim()) {
      const commitMsg = `publish: update blog content (${new Date().toISOString().slice(0, 10)})`;
      const commitRes = await runCmd(`git commit -m "${commitMsg}"`);
      if (!commitRes.success && !commitRes.stdout.includes('nothing to commit')) {
        return json({ success: false, error: 'git commit 失敗', log: commitRes.stderr || commitRes.stdout });
      }
      logs.push(`Commit 建立完成: ${commitMsg}`);
    } else {
      logs.push('沒有需要 Commit 的新變更，直接進行推送。');
    }

    // Step 3: git push
    logs.push('[3/3] 正在推送到 GitHub...');
    let pushCmd = 'git push origin main';

    if (cfg.githubToken && cfg.githubToken.trim()) {
      const repoUrl = `https://${cfg.githubToken}@github.com/${cfg.repo || 'DL049/DL049.github.io'}.git`;
      pushCmd = `git push ${repoUrl} main`;
    }

    const pushRes = await runCmd(pushCmd);
    if (!pushRes.success) {
      let cleanErr = (pushRes.stderr || pushRes.stdout || pushRes.error || '').replace(new RegExp(cfg.githubToken, 'g'), '***TOKEN***');
      logs.push(`推送失敗: ${cleanErr}`);
      return json({
        success: false,
        error: '推送至 GitHub 失敗，請確認 Token 權限（需勾選 repo 權限）或網路連線。',
        log: logs.join('\n') + '\n\n' + cleanErr
      });
    }

    logs.push('🎉 成功推送到 GitHub！GitHub Actions 將自動開始構建與發布。');
    return json({
      success: true,
      log: logs.join('\n') + '\n' + (pushRes.stdout || pushRes.stderr)
    });
  }

  // 9. Preview Toggle (Jekyll Serve with --drafts flag)
  if (method === 'POST' && pathname === '/api/preview/start') {
    if (jekyllProcess) {
      return json({ success: true, message: '預覽服務已在運行中' });
    }

    try {
      jekyllProcess = spawn('bundle', ['exec', 'jekyll', 'serve', '--livereload', '--port', '4000', '--drafts'], {
        cwd: ROOT_DIR,
        shell: true
      });

      jekyllProcess.on('exit', () => {
        jekyllProcess = null;
      });

      return json({ success: true, message: '預覽服務已啟動（包含草稿預覽），請訪問 http://127.0.0.1:4000' });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  if (method === 'POST' && pathname === '/api/preview/stop') {
    if (jekyllProcess) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${jekyllProcess.pid} /T /F`);
        } else {
          jekyllProcess.kill();
        }
      } catch (e) {}
      jekyllProcess = null;
      return json({ success: true, message: '預覽服務已停止' });
    }
    return json({ success: true, message: '預覽服務未運行' });
  }

  if (method === 'GET' && pathname === '/api/preview/status') {
    return json({ success: true, running: !!jekyllProcess, url: 'http://127.0.0.1:4000' });
  }

  // 10. Static File Serving (Admin UI) & Assets Serving
  let filePath;
  if (pathname.startsWith('/assets/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else {
    filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      fs.createReadStream(fallbackPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  D-Lib 部落格管理後台 (升級版) 已成功啟動！`);
  console.log(`  管理後台網址: http://localhost:${PORT}`);
  console.log(`  按 Ctrl + C 可關閉服務`);
  console.log(`===============================================`);
});
