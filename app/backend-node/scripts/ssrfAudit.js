/**
 * ssrfAudit.js
 * Comprehensive SSRF protection test for safeUrlValidator.js
 * Tests all required attack vectors.
 */

import { validateUrl } from '../services/safeUrlValidator.js';

const tests = [
  // Should PASS (valid vendor URLs)
  { url: 'https://www.amazon.in/product/dp/B0ABC', expect: true, label: 'Valid Amazon URL' },
  { url: 'https://www.flipkart.com/product/p/itm123', expect: true, label: 'Valid Flipkart URL' },
  { url: 'https://www.croma.com/product/p/12345', expect: true, label: 'Valid Croma URL' },
  { url: 'https://www.jiomart.com/p/electronics/product-123', expect: true, label: 'Valid JioMart URL' },
  { url: 'https://www.vijaysales.com/p/P123/456/product-name', expect: true, label: 'Valid Vijay Sales URL' },

  // Should FAIL (SSRF / private / dangerous)
  { url: 'http://localhost/admin', expect: false, label: 'localhost HTTP' },
  { url: 'https://localhost:443/admin', expect: false, label: 'localhost HTTPS port 443' },
  { url: 'http://127.0.0.1/etc/passwd', expect: false, label: '127.0.0.1' },
  { url: 'http://0.0.0.0/hack', expect: false, label: '0.0.0.0' },
  { url: 'http://10.0.0.1/internal', expect: false, label: 'RFC1918 10.x.x.x' },
  { url: 'http://10.255.255.255/internal', expect: false, label: 'RFC1918 10.255.255.255' },
  { url: 'http://172.16.0.1/internal', expect: false, label: 'RFC1918 172.16.x.x' },
  { url: 'http://172.31.255.255/internal', expect: false, label: 'RFC1918 172.31.255.255' },
  // 172.15.x.x is technically a public IP range (not RFC1918), but the domain allowlist (2nd defense layer)
  // correctly blocks it since it's not a recognized vendor domain. This is a SAFE, MORE RESTRICTIVE outcome.
  { url: 'http://172.15.0.1/not-private', expect: false, label: 'Non-private 172.15.x blocked by domain allowlist (safe, strict)' },
  { url: 'http://192.168.0.1/router', expect: false, label: 'RFC1918 192.168.x.x' },
  { url: 'http://169.254.169.254/latest/meta-data/', expect: false, label: 'AWS metadata endpoint' },
  { url: 'http://169.254.0.1/link-local', expect: false, label: 'Link-local IP' },
  { url: 'file:///etc/passwd', expect: false, label: 'file:// protocol' },
  { url: 'ftp://ftp.example.com/file', expect: false, label: 'ftp:// protocol' },
  { url: 'javascript:alert(1)', expect: false, label: 'javascript: protocol' },
  { url: 'http://::1/ipv6-loopback', expect: false, label: 'IPv6 loopback ::1' },
  { url: 'http://[::1]/ipv6-loopback', expect: false, label: 'IPv6 loopback [::1] bracketed' },
  { url: 'http://[fd00::1]/ipv6-private', expect: false, label: 'IPv6 ULA fd00::1' },
  { url: 'http://[fe80::1]/ipv6-link-local', expect: false, label: 'IPv6 link-local fe80::1' },
  { url: null, expect: false, label: 'null URL' },
  { url: '', expect: false, label: 'empty string' },
  { url: '#', expect: false, label: 'placeholder #' },
  { url: 'N/A', expect: false, label: 'placeholder N/A' },
  { url: 'not-a-url', expect: false, label: 'malformed URL' },
  { url: 'http://www.amazon.in:8080/product', expect: false, label: 'Non-standard port 8080' },
  { url: 'http://www.amazon.in:22/ssh', expect: false, label: 'Port 22 (SSH)' },
  { url: 'https://evil.com/malicious', expect: false, label: 'Unrecognized domain evil.com' },
  { url: 'https://www.amazon.in.evil.com/phish', expect: false, label: 'Domain spoofing amazon.in.evil.com' },
];

let passed = 0, failed = 0;
console.log('\n' + '═'.repeat(72));
console.log('  SSRF & URL SECURITY AUDIT — safeUrlValidator.js');
console.log('═'.repeat(72));

for (const t of tests) {
  const result = validateUrl(t.url);
  const gotValid = result.isValid;
  const ok = gotValid === t.expect;
  if (ok) passed++;
  else failed++;

  const icon = ok ? '✅' : '❌ FAIL';
  const expectedStr = t.expect ? 'ALLOW' : 'BLOCK';
  const gotStr = gotValid ? 'ALLOW' : `BLOCK (${result.error})`;
  console.log(`${icon}  [${expectedStr}] ${t.label}`);
  if (!ok) {
    console.log(`      Expected: ${expectedStr}  Got: ${gotStr}`);
  }
}

console.log('\n' + '─'.repeat(72));
console.log(`  Results: ${passed}/${tests.length} passed, ${failed} failed`);
if (failed === 0) {
  console.log('  ✅ ALL SSRF TESTS PASSED — validator is secure.');
} else {
  console.log('  ❌ SSRF VULNERABILITIES DETECTED — immediate fix required!');
}
console.log('═'.repeat(72) + '\n');
