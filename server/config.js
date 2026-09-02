const crypto = require('crypto');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// JWT secret resolution. Never fall back to a hardcoded public value: with a
// known secret anyone can forge auth tokens. If JWT_SECRET is missing we
// generate a random secret per boot and warn loudly (existing sessions will
// be invalidated on restart, which is acceptable vs. a forgeable default).
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

if (!process.env.JWT_SECRET) {
    console.warn(
        '⚠️  JWT_SECRET is not set in the environment. A random secret was generated for this ' +
        'server session. Set JWT_SECRET in .env to keep sessions stable across restarts.'
    );
}

module.exports = { JWT_SECRET };
