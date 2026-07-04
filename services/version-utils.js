/**
 * @param {string} version
 * @returns {number[]}
 */
function parseVersion(version) {
  return String(version).trim().replace(/^v/i, '').split('.').map((part) => {
    const num = parseInt(part, 10);
    return Number.isFinite(num) ? num : 0;
  });
}

/**
 * @param {string} current
 * @param {string} latest
 * @returns {boolean}
 */
function isVersionOlder(current, latest) {
  if (!current || !latest) return false;

  const c = parseVersion(current);
  const l = parseVersion(latest);
  const len = Math.max(c.length, l.length);

  for (let i = 0; i < len; i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (cv < lv) return true;
    if (cv > lv) return false;
  }

  return false;
}

module.exports = {
  isVersionOlder,
  parseVersion,
};
