function humanize(s) {
  if (!s) return '';
  return String(s)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeBase64Encode(str) {
  return Buffer.from(String(str), 'utf8').toString('base64').replace(/=+$/g, '');
}

function safeBase64Decode(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(String(b64) + pad, 'base64').toString('utf8');
}

module.exports = { humanize, safeBase64Encode, safeBase64Decode };
