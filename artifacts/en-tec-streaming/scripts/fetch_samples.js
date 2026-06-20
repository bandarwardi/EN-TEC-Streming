/**
 * Xtream Codes Metadata Sampler Script
 * 
 * This script connects to your Xtream Codes IPTV server, fetches categories,
 * grabs a sample item for Live TV, Movie VOD, and Series VOD, queries their full details,
 * and saves the raw JSON metadata to disk. This helps identify what fields are returned
 * by the server and what might be missing or not displayed in the application.
 * 
 * Usage:
 *   node fetch_samples.js <host> <username> <password>
 * 
 * Example:
 *   node fetch_samples.js http://myiptv.com:8080 myuser mypass
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Helper to make HTTP/HTTPS GET requests returning parsed JSON
function getJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP status ${res.statusCode} for ${url}`));
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${e.message}\nRaw data: ${data.substring(0, 300)}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching URL: ${url}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let host = args[0];
  let username = args[1];
  let password = args[2];

  if (!host || !username || !password) {
    console.log('\x1b[31mError: Missing arguments.\x1b[0m');
    console.log('Usage:');
    console.log('  node fetch_samples.js <host> <username> <password>');
    console.log('\nExample:');
    console.log('  node fetch_samples.js http://myiptv.com:8080 myuser mypass');
    process.exit(1);
  }

  // Format host URL
  host = host.replace(/\/$/, ''); // Remove trailing slash if any
  const apiBase = `${host}/player_api.php?username=${username}&password=${password}`;

  const outputDir = path.resolve(__dirname, 'samples_output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n\x1b[36mConnecting to Xtream Codes server:\x1b[0m ${host}`);
  console.log(`\x1b[36mOutput directory:\x1b[0m ${outputDir}\n`);

  try {
    // 1. Verify account status
    console.log('1. Checking account credentials...');
    const accountInfo = await getJson(apiBase);
    
    if (!accountInfo || !accountInfo.user_info || accountInfo.user_info.auth === 0) {
      throw new Error('Authentication failed: Invalid Username or Password.');
    }
    
    console.log(`   \x1b[32mSuccess!\x1b[0m Status: ${accountInfo.user_info.status || 'Active'}`);
    console.log(`   Expiry Date: ${accountInfo.user_info.exp_date ? new Date(parseInt(accountInfo.user_info.exp_date, 10) * 1000).toLocaleDateString() : 'Unlimited'}`);
    
    fs.writeFileSync(path.join(outputDir, '0_account_info.json'), JSON.stringify(accountInfo, null, 2));

    // 2. Fetch categories
    console.log('\n2. Fetching categories...');
    const [liveCats, vodCats, seriesCats] = await Promise.all([
      getJson(`${apiBase}&action=get_live_categories`).catch(() => []),
      getJson(`${apiBase}&action=get_vod_categories`).catch(() => []),
      getJson(`${apiBase}&action=get_series_categories`).catch(() => [])
    ]);

    console.log(`   Live Categories: ${liveCats.length}`);
    console.log(`   VOD Movie Categories: ${vodCats.length}`);
    console.log(`   Series Categories: ${seriesCats.length}`);

    fs.writeFileSync(path.join(outputDir, '1_categories.json'), JSON.stringify({ live: liveCats, vod: vodCats, series: seriesCats }, null, 2));

    // 3. Live Channel Sample
    if (liveCats.length > 0) {
      // Find a category that isn't empty (or just use first)
      const targetCat = liveCats.find(c => c.category_id) || liveCats[0];
      console.log(`\n3. Fetching live streams in category: "${targetCat.category_name}" (ID: ${targetCat.category_id})...`);
      const streams = await getJson(`${apiBase}&action=get_live_streams&category_id=${targetCat.category_id}`);
      
      if (Array.isArray(streams) && streams.length > 0) {
        const sample = streams[0];
        console.log(`   \x1b[32mFound Live stream sample:\x1b[0m "${sample.name}" (ID: ${sample.stream_id})`);
        fs.writeFileSync(path.join(outputDir, '2_live_stream_sample.json'), JSON.stringify(sample, null, 2));
        
        // Try to fetch EPG for this channel
        console.log(`   Fetching EPG listing for channel (ID: ${sample.stream_id})...`);
        const epg = await getJson(`${apiBase}&action=get_simple_data_table&stream_id=${sample.stream_id}`).catch(() => null);
        if (epg) {
          fs.writeFileSync(path.join(outputDir, '2_live_epg_sample.json'), JSON.stringify(epg, null, 2));
          console.log(`   EPG saved (listings count: ${epg.epg_listings ? epg.epg_listings.length : 0})`);
        }
      } else {
        console.log('   No live streams found in this category.');
      }
    }

    // 4. Movie VOD Sample & Info
    if (vodCats.length > 0) {
      const targetCat = vodCats.find(c => c.category_id) || vodCats[0];
      console.log(`\n4. Fetching VOD streams in category: "${targetCat.category_name}" (ID: ${targetCat.category_id})...`);
      const streams = await getJson(`${apiBase}&action=get_vod_streams&category_id=${targetCat.category_id}`);
      
      if (Array.isArray(streams) && streams.length > 0) {
        const sample = streams[0];
        console.log(`   \x1b[32mFound Movie sample:\x1b[0m "${sample.name}" (ID: ${sample.stream_id})`);
        fs.writeFileSync(path.join(outputDir, '3_movie_stream_sample.json'), JSON.stringify(sample, null, 2));
        
        // Fetch detailed movie info (get_vod_info)
        console.log(`   Fetching full movie details (action=get_vod_info&vod_id=${sample.stream_id})...`);
        const info = await getJson(`${apiBase}&action=get_vod_info&vod_id=${sample.stream_id}`).catch(() => null);
        if (info) {
          fs.writeFileSync(path.join(outputDir, '3_movie_details_sample.json'), JSON.stringify(info, null, 2));
          console.log('   Movie details metadata saved successfully!');
          
          // Print summary of available metadata keys
          console.log('\n   \x1b[33mAvailable VOD Movie Details Fields:\x1b[0m');
          if (info.info) {
            Object.keys(info.info).forEach(key => {
              const valPreview = typeof info.info[key] === 'object' ? '[Object/Array]' : String(info.info[key]).substring(0, 50);
              console.log(`     - info.${key}: ${valPreview}`);
            });
          }
          if (info.movie_data) {
            console.log('   \x1b[33mAvailable movie_data Fields:\x1b[0m');
            Object.keys(info.movie_data).forEach(key => {
              console.log(`     - movie_data.${key}`);
            });
          }
        }
      } else {
        console.log('   No movies found in this category.');
      }
    }

    // 5. TV Series Sample & Info
    if (seriesCats.length > 0) {
      const targetCat = seriesCats.find(c => c.category_id) || seriesCats[0];
      console.log(`\n5. Fetching TV series in category: "${targetCat.category_name}" (ID: ${targetCat.category_id})...`);
      const seriesList = await getJson(`${apiBase}&action=get_series&category_id=${targetCat.category_id}`);
      
      if (Array.isArray(seriesList) && seriesList.length > 0) {
        const sample = seriesList[0];
        console.log(`   \x1b[32mFound TV Series sample:\x1b[0m "${sample.name}" (ID: ${sample.series_id})`);
        fs.writeFileSync(path.join(outputDir, '4_series_stream_sample.json'), JSON.stringify(sample, null, 2));
        
        // Fetch detailed series info (get_series_info)
        console.log(`   Fetching full series details (action=get_series_info&series_id=${sample.series_id})...`);
        const info = await getJson(`${apiBase}&action=get_series_info&series_id=${sample.series_id}`).catch(() => null);
        if (info) {
          fs.writeFileSync(path.join(outputDir, '4_series_details_sample.json'), JSON.stringify(info, null, 2));
          console.log('   TV Series details metadata saved successfully!');
          
          // Print summary of available metadata keys
          console.log('\n   \x1b[33mAvailable TV Series Details Fields:\x1b[0m');
          if (info.info) {
            Object.keys(info.info).forEach(key => {
              const valPreview = typeof info.info[key] === 'object' ? '[Object/Array]' : String(info.info[key]).substring(0, 50);
              console.log(`     - info.${key}: ${valPreview}`);
            });
          }
          if (info.episodes) {
            const seasons = Object.keys(info.episodes);
            console.log(`   Seasons found: ${seasons.join(', ')}`);
            const firstSeason = seasons[0];
            if (firstSeason && info.episodes[firstSeason].length > 0) {
              console.log(`   Episode sample metadata (Season ${firstSeason}, Ep 1):`);
              const ep = info.episodes[firstSeason][0];
              Object.keys(ep).forEach(key => {
                console.log(`     - episode.${key}`);
              });
            }
          }
        }
      } else {
        console.log('   No TV series found in this category.');
      }
    }

    console.log(`\n\x1b[32mMetadata sample fetching finished successfully!\x1b[0m`);
    console.log(`All files are saved in: ${outputDir}`);
  } catch (err) {
    console.error('\n\x1b[31mError fetching metadata samples:\x1b[0m', err.message || err);
    process.exit(1);
  }
}

main();
