const app = require('../backend/server');

module.exports = (req, res) => {
    // Normalization helper for Vercel query rewrites
    if (req.query && (req.query['0'] || req.query['path'])) {
        const subPath = req.query['0'] || req.query['path'];
        const fullPath = Array.isArray(subPath) ? subPath.join('/') : subPath;
        if (req.url.startsWith('/api/index.js') || req.url.startsWith('/index.js') || req.url.startsWith('/api?')) {
            req.url = '/' + fullPath;
        }
    }
    return app(req, res);
};
