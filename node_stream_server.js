// node_stream_server.js
const http = require('http');
const { URL } = require('url');
const { getStreamUrl } = require('./webcam_scraper');

const PORT = process.env.PORT || 3000;  // Port from environment for Render

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  if (reqUrl.pathname === '/stream-url') {
    const targetUrl = reqUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Missing "url" query parameter');
    }
    // Use the scraper to find a stream URL from the target page
    getStreamUrl(targetUrl)
      .then(streamUrl => {
        if (!streamUrl) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Stream URL not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(streamUrl);
        }
      })
      .catch(err => {
        console.error('Error scraping stream URL:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error: ' + err.message);
      });
  } else {
    // Optional: a simple home route
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Node Stream Server is running.');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
