const https = require('https');
const http = require('http');
const { URL } = require('url');
const cheerio = require('cheerio');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (WebcamScraper)' } }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function getStreamUrl(pageUrl) {
  try {
    const html = await fetchPage(pageUrl);
    const $ = cheerio.load(html);

    // 1. YouTube-style iframe
    const iframe = $('iframe[src*="youtube"], iframe[src*="youtu.be"]').first();
    if (iframe.length) {
      return iframe.attr('src');
    }

    // 2. HTML5 video with source
    const source = $('video source[src]').first();
    if (source.length) {
      return source.attr('src');
    }

    // 3. Raw video tag
    const video = $('video[src]').first();
    if (video.length) {
      return video.attr('src');
    }

    // 4. Fallback: look for .m3u8 or .mpd in HTML
    const m3u8Match = html.match(/https?:\/\/[^"' ]+\.m3u8/);
    if (m3u8Match) return m3u8Match[0];

    const mpdMatch = html.match(/https?:\/\/[^"' ]+\.mpd/);
    if (mpdMatch) return mpdMatch[0];

    return null;
  } catch (err) {
    throw new Error(`Failed to extract stream: ${err.message}`);
  }
}

module.exports = { getStreamUrl };
