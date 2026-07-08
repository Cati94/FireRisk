import fs from 'node:fs';

const requiredFiles = [
  '.env.example',
  'public/index.html',
  'public/app.js',
  'src/server.mjs',
  'src/providers/index.mjs'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('FireRisk foundation check passed.');
