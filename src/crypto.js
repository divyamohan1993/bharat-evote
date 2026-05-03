// Hybrid encryption layer.
// Authority key: AES-256-GCM symmetric (server held). Ciphertext only opens
// in 'closed' phase via authority key. Demo proxy for ML-KEM/ML-DSA hybrid -
// real deployment would use liboqs or @hpke-js + Kyber-768.

import { createCipheriv, createDecipheriv, randomBytes, createHash, hkdfSync } from 'node:crypto';

const MASTER = (() => {
  const seed = process.env.AUTHORITY_SEED || 'bharat-evote-' + (process.env.K_REVISION || 'local');
  return createHash('sha256').update(seed).digest();
})();

function deriveKey(label) {
  return Buffer.from(hkdfSync('sha256', MASTER, Buffer.alloc(16, 1), Buffer.from(label), 32));
}

const VOTE_KEY = deriveKey('bharat-evote/vote/aes-gcm/v1');
const BLIND_KEY = deriveKey('bharat-evote/blind/v1');

export function encryptBallot(plain) {
  const iv = randomBytes(12);
  const data = Buffer.from(JSON.stringify(plain), 'utf8');
  const cipher = createCipheriv('aes-256-gcm', VOTE_KEY, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: 'AES-256-GCM+HKDF-SHA256(simulated-PQ-hybrid)',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: enc.toString('base64')
  };
}

export function decryptBallot(c) {
  const iv = Buffer.from(c.iv, 'base64');
  const tag = Buffer.from(c.tag, 'base64');
  const ct = Buffer.from(c.ct, 'base64');
  const dec = createDecipheriv('aes-256-gcm', VOTE_KEY, iv);
  dec.setAuthTag(tag);
  const out = Buffer.concat([dec.update(ct), dec.final()]);
  return JSON.parse(out.toString('utf8'));
}

// Voter blind: HMAC-style, lets us prevent double-vote without storing voter_id
// alongside ballot. Same voter -> same blind; different voters -> different.
export function blind(voter_id) {
  return createHash('sha256').update(BLIND_KEY).update(':').update(voter_id).digest('hex');
}

// Helper for clients: returns a synthetic OTP derived from voter_id + boot seed.
// Real system: SMS via DLT route + TOTP. Here we mirror logic on the server.
export function syntheticOtp(seed) {
  return createHash('sha256').update(seed).digest('hex').slice(0, 6).toUpperCase();
}
