const path = require('path');

const IP2Region = require('ip2region').default;
const dbPath = path.join(__dirname, '..', 'node_modules', 'ip2region', 'data', 'ip2region.db');

let searcher = null;

function getSearcher() {
  if (searcher) return searcher;
  searcher = new IP2Region({ ipv4db: dbPath });
  return searcher;
}

function getProvince(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return null;
  try {
    const s = getSearcher();
    const result = s.search(ip);
    if (!result) return null;
    const province = result.province || '';
    const city = result.city || '';
    if (city && city !== province) {
      return province + ' ' + city;
    }
    return province || result.country || null;
  } catch (err) {
    console.warn('[ipLocator] 查询失败', ip, err.message);
    return null;
  }
}

module.exports = { getProvince };
