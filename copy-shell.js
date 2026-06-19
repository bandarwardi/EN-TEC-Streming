import fs from 'node:fs';
import path from 'node:path';

const src = path.join('dist', 'client', '_shell.html');
const dest = path.join('dist', 'client', 'index.html');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[Post-Build] Successfully copied ${src} to ${dest}`);
  } else {
    console.error(`[Post-Build] Error: Source file not found at ${src}`);
    process.exit(1);
  }
} catch (err) {
  console.error('[Post-Build] Failed to copy shell file:', err);
  process.exit(1);
}
