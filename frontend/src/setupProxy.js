const { createProxyMiddleware } = require('http-proxy-middleware');

// The native startup exports BACKEND_PORT before launching react-scripts.
// Keep its package proxy as the fallback when the frontend is launched alone.
module.exports = function setupProxy(app) {
  const target = process.env.BACKEND_PORT
    ? 'http://127.0.0.1:' + process.env.BACKEND_PORT
    : require('../package.json').proxy;
  if (!target || !/^https?:\/\//.test(target)) throw new Error('A valid native API proxy target is required');
  app.use(createProxyMiddleware('/api', {
    target,
    changeOrigin: true,
    logLevel: 'silent',
    onProxyReq(upstream, req, res) {
      if (upstream.getHeader('origin')) upstream.setHeader('origin', target);
      const abort = () => { if (!upstream.destroyed) upstream.destroy(); };
      const close = () => { if (!res.writableEnded) abort(); };
      const cleanup = () => { req.off('aborted', abort); res.off('close', close); };
      req.once('aborted', abort);
      res.once('close', close);
      upstream.once('close', cleanup);
    },
    onError(_error, _req, res) {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'The native API could not be reached. Check that the backend is running.' }));
    },
  }));
};
