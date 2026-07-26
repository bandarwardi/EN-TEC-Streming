const fs = require('fs');
const files = ['actor-detail.tsx', 'continue-watching.tsx', 'downloads.tsx', 'favorites.tsx', 'playlists.tsx', 'search.tsx'];

files.forEach(f => {
  const p = 'c:/streaming/artifacts/streaming/app/' + f;
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/\(\) => router\.back\(\)/g, "() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); } }");
    fs.writeFileSync(p, c);
    console.log('Fixed ' + f);
  }
});
