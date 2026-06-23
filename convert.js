const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.expo')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('package.json')) results.push(file);
    }
  });
  return results;
}

const files = walk('.');
const versions = {
  '@tanstack/react-query': '^5.90.21',
  'react': '19.1.0',
  'react-dom': '19.1.0',
  'zod': '^3.25.76',
  'drizzle-orm': '^0.45.2',
  'framer-motion': '^12.23.24',
  'lucide-react': '^0.545.0',
  'tailwind-merge': '^3.3.1',
  'tailwindcss': '^4.1.14',
  'tsx': '^4.21.0',
  'vite': '^7.3.2',
  'wouter': '^3.3.5',
  'clsx': '^2.1.1',
  'class-variance-authority': '^0.7.1',
  '@vitejs/plugin-react': '^5.0.4',
  '@types/react': '^19.2.0',
  '@types/react-dom': '^19.2.0',
  '@types/node': '^25.3.3',
  '@tailwindcss/vite': '^4.1.14'
};

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  if (content.includes('"workspace:*"')) {
    content = content.replace(/"workspace:\*"/g, '"*"');
    changed = true;
  }
  
  if (content.includes('"catalog:"')) {
    const pkgJson = JSON.parse(content);
    for (const deps of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (pkgJson[deps]) {
        for (const [pkg, ver] of Object.entries(pkgJson[deps])) {
          if (ver === 'catalog:') {
            pkgJson[deps][pkg] = versions[pkg] || '*';
            changed = true;
          }
        }
      }
    }
    content = JSON.stringify(pkgJson, null, 2);
  }
  
  if (changed) {
    console.log('Updated ' + f);
    fs.writeFileSync(f, content);
  }
});
