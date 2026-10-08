// Signs release builds with private/pulsecover-release.jks when private/keystore.properties exists (otherwise falls back to the debug key).
const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs'); const path = require('path');

module.exports = (config) => withAppBuildGradle(config, (cfg) => {
  const props = path.join(cfg.modRequest.projectRoot, 'private', 'keystore.properties');
  if (!fs.existsSync(props) || cfg.modResults.contents.includes('pulsecoverRelease')) return cfg;
  const kv = Object.fromEntries(fs.readFileSync(props, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  const store = path.join(cfg.modRequest.projectRoot, 'private', kv.storeFile || 'pulsecover-release.jks').replace(/\\/g, '/');
  const signing = `
        pulsecoverRelease {
            storeFile file('${store}')
            storePassword '${kv.storePassword}'
            keyAlias '${kv.keyAlias}'
            keyPassword '${kv.keyPassword}'
        }`;
  let g = cfg.modResults.contents;
  g = g.replace(/signingConfigs \{/, `signingConfigs {${signing}`);
  g = g.replace(/(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.pulsecoverRelease');
  cfg.modResults.contents = g; return cfg;
});
