const fs = require('fs');

let playlistsCode = fs.readFileSync('C:/streaming/artifacts/streaming/app/playlists.tsx', 'utf8');

playlistsCode = playlistsCode.replace(
  /onPress=\{\(\) => handleRefresh\(item\.id\)\}/g,
  'onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); if (e && e.preventDefault) e.preventDefault(); handleRefresh(item.id); }}'
);

playlistsCode = playlistsCode.replace(
  /onPress=\{\(\) => handleDelete\(item\.id, item\.name\)\}/g,
  'onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); if (e && e.preventDefault) e.preventDefault(); handleDelete(item.id, item.name); }}'
);

fs.writeFileSync('C:/streaming/artifacts/streaming/app/playlists.tsx', playlistsCode);
console.log('Patched playlists.tsx');

let storeCode = fs.readFileSync('C:/streaming/artifacts/streaming/store/app-store.ts', 'utf8');

// replace get.php and player_api.php with a timestamp to prevent caching
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(`\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}`\)/g,
  'fetchJsonWithFallback(`${host}/player_api.php?username=${username}&password=${password}&_t=${Date.now()}`)'
);
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(`\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=([^`]+)`\)/g,
  'fetchJsonWithFallback(`${host}/player_api.php?username=${username}&password=${password}&action=$1&_t=${Date.now()}`)'
);

storeCode = storeCode.replace(
  /const authUrl = `\$\{config\.host\}\/player_api\.php\?username=\$\{config\.username\}&password=\$\{config\.password\}`/g,
  'const authUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&_t=${Date.now()}`'
);

storeCode = storeCode.replace(
  /const fetchUrl = `\$\{config\.host\}\/player_api\.php\?username=\$\{config\.username\}&password=\$\{config\.password\}&action=\$\{action\}&category_id=\$\{categoryId\}`/g,
  'const fetchUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=${action}&category_id=${categoryId}&_t=${Date.now()}`'
);

fs.writeFileSync('C:/streaming/artifacts/streaming/store/app-store.ts', storeCode);
console.log('Patched app-store.ts');
