// webcam_scraper.js
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Fetch the content of a webpage via HTTP/HTTPS.
 * Returns a Promise that resolves with the page HTML.
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (RenderWebcamScraper/1.0)' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirects (3xx)
          return resolve(fetchPage(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Request failed with status ${res.statusCode}`));
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Extract a likely stream URL from a given page URL or its HTML.
 * - For YouTube links, returns an embed URL.
 * - If the URL is a direct stream (e.g. ends with .m3u8), returns it.
 * - For known webcam providers (ipcamlive, livespotting, etc.), returns the URL itself.
 * - Otherwise, fetches the page HTML and looks for an <iframe> or <video> source.
 */
async function getStreamUrl(pageUrl) {
  const lowerUrl = pageUrl.trim().toLowerCase();
  // 1. YouTube URLs – convert watch or youtu.be links to embed URL
  const ytMatch = lowerUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (lowerUrl.includes('youtube.com/embed')) {
    return pageUrl;  // already an embed URL
  }
  // 2. Direct HLS stream or known live cam provider
  if (lowerUrl.endsWith('.m3u8') || lowerUrl.endsWith('.mpd')) {
    return pageUrl;
  }
  if (/(ipcamlive\.com|livespotting\.com|webcam\.io|streamable\.com|dacast|wowza)/.test(lowerUrl)) {
    return pageUrl;
  }
  // 3. Fallback: fetch the page HTML and search for stream indicators
  try {
    const html = await fetchPage(pageUrl);
    // Look for an <iframe src="...">
    const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (iframeMatch) {
      const src = iframeMatch[1];
      // If the iframe is YouTube or another known site, recursively get its stream URL
      if (/youtube\.com\/embed|youtube\.com\/watch|youtu\.be\//.test(src)) {
        return getStreamUrl(src);
      }
      if (src.match(/\.(m3u8|mpd)$/)) {
        return src;
      }
      return src;
    }
    // Look for a <source src="..."> in a video tag
    const sourceMatch = html.match(/<source[^>]+src="([^"]+)"/i);
    if (sourceMatch) {
      return sourceMatch[1];
    }
    // Or a <video src="...">
    const videoMatch = html.match(/<video[^>]+src="([^"]+)"/i);
    if (videoMatch) {
      return videoMatch[1];
    }
    // No stream URL found in the content
    return null;
  } catch (err) {
    throw new Error(`Failed to fetch/parse page: ${err.message}`);
  }
}

module.exports = { getStreamUrl };
