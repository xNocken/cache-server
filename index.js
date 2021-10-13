const http = require('http');
const cache = require('./client');

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(404);
    res.end('no');

    return;
  }

  const [, type, group, key, value] = req.url.split('/');

  if (type === 'addEntry') {
    cache.addEntry({
      key,
      group,
      value,
      expiresIn: 500,
    }).then((response) => {
      res.end(response?.toString() || '');
    }).catch((code) => {
      res.end(code.toString());
    });

    return;
  }

  cache[type]({
    key,
    group,
  }).then((response) => {
    res.end(response?.toString() || '');
  }).catch((code) => {
    res.end(code.toString());
  });

  res.writeHead(200);
});

server.listen(10001);
