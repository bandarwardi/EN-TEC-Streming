const fs = require('fs');

// 1. Patch playlists.tsx to stop propagation on action buttons
let playlistsCode = fs.readFileSync('C:/streaming/artifacts/streaming/app/playlists.tsx', 'utf8');

playlistsCode = playlistsCode.replace(
  /onPress=\{\(\) => handleRefresh\(item\.id\)\}/g,
  'onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); handleRefresh(item.id); }}'
);

playlistsCode = playlistsCode.replace(
  /onPress=\{\(\) => handleDelete\(item\.id, item\.name\)\}/g,
  'onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); handleDelete(item.id, item.name); }}'
);

fs.writeFileSync('C:/streaming/artifacts/streaming/app/playlists.tsx', playlistsCode);
console.log('Patched playlists.tsx');

// 2. Patch app-store.ts to add cache-busters
let storeCode = fs.readFileSync('C:/streaming/artifacts/streaming/store/app-store.ts', 'utf8');

// In loadPlaylistFromUrl:
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&_t=)'
);

storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=get_live_categories\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&action=get_live_categories&_t=)'
);
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=get_vod_categories\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&action=get_vod_categories&_t=)'
);
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=get_series_categories\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&action=get_series_categories&_t=)'
);
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=get_live_streams\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&action=get_live_streams&_t=)'
);
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=get_vod_streams\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&action=get_vod_streams&_t=)'
);
storeCode = storeCode.replace(
  /fetchJsonWithFallback\(\\$\{host\}\/player_api\.php\?username=\$\{username\}&password=\$\{password\}&action=get_series\\)/g,
  'fetchJsonWithFallback(${host}/player_api.php?username=&password=&action=get_series&_t=)'
);

// In getChannelsForCategory:
storeCode = storeCode.replace(
  /const authUrl = \\$\{config\.host\}\/player_api\.php\?username=\$\{config\.username\}&password=\$\{config\.password\}\;/g,
  'const authUrl = ${config.host}/player_api.php?username=&password=&_t=;'
);

storeCode = storeCode.replace(
  /const fetchUrl = \\$\{config\.host\}\/player_api\.php\?username=\$\{config\.username\}&password=\$\{config\.password\}&action=\$\{action\}&category_id=\$\{categoryId\}\;/g,
  'const fetchUrl = ${config.host}/player_api.php?username=&password=&action=&category_id=&_t=;'
);

fs.writeFileSync('C:/streaming/artifacts/streaming/store/app-store.ts', storeCode);
console.log('Patched app-store.ts');
