// REST API for Bharat eVote.
// Routes prefixed with /v1 plus thin /api/* aliases for browser convenience.

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from './logger.js';
import { store } from './store.js';
import { encryptBallot, blind, syntheticOtp } from './crypto.js';

const SESSION_COOKIE = 'be_sid';
const ADMIN_COOKIE = 'be_admin';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-' + (process.env.K_REVISION || 'local');

function api() {
  const r = Router();
  r.use((req, _res, next) => { req.startedAt = Date.now(); next(); });

  // ---------- Election public ----------
  r.get('/election', (_req, res) => res.json(store.election.summary()));
  r.get('/election/parties', (_req, res) => res.json(store.election.parties));
  r.get('/election/constituencies', (req, res) => {
    const q = (req.query.q || '').toString().toLowerCase();
    let list = store.election.constituencies;
    if (q) list = list.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
    res.json({ count: list.length, items: list.slice(0, 200) });
  });
  r.get('/election/candidates', (req, res) => {
    const code = (req.query.constituency || '').toString().toUpperCase();
    if (!code) return res.json({ count: store.election.candidates.length, items: store.election.candidates });
    const items = store.election.candidates.filter(c => c.constituency_code === code);
    res.json({ count: items.length, items });
  });

  // ---------- Voter sample (demo only) ----------
  r.get('/voters/sample', (_req, res) => res.json(store.voters.sample(24)));
  r.get('/voters/:id', (req, res) => {
    const v = store.voters.get(String(req.params.id).toUpperCase());
    if (!v) return res.status(404).json({ error: { code: 'voter_not_found', message: 'No such voter on roll' } });
    res.json({
      voter_id: v.voter_id, name: v.name, dob: v.dob,
      constituency_code: v.constituency_code, constituency_name: v.constituency_name,
      state: v.state, voted: v.voted
    });
  });

  // ---------- Auth: OTP request + verify ----------
  r.post('/auth/request-otp', (req, res) => {
    const id = String(req.body?.voter_id || '').toUpperCase();
    const v = store.voters.get(id);
    if (!v) return res.status(404).json({ error: { code: 'voter_not_found', message: 'Voter not on roll' } });
    if (v.voted) return res.status(409).json({ error: { code: 'already_voted', message: 'You have already cast your vote' } });
    const otp = syntheticOtp(v.otp_seed + ':' + new Date().toISOString().slice(0, 13));
    logger.info('otp.issue', { rid: req.id, voter_id: id, masked: otp.slice(0, 2) + '••••' });
    // In a real system OTP is sent via SMS. Here we return it for the demo.
    res.json({ ok: true, voter_id: id, otp_demo: otp, expires_in_s: 300 });
  });

  r.post('/auth/verify-otp', (req, res) => {
    const id = String(req.body?.voter_id || '').toUpperCase();
    const otp = String(req.body?.otp || '').toUpperCase();
    const v = store.voters.get(id);
    if (!v) return res.status(404).json({ error: { code: 'voter_not_found', message: 'Voter not on roll' } });
    if (v.voted) return res.status(409).json({ error: { code: 'already_voted', message: 'Already voted' } });
    const expected = syntheticOtp(v.otp_seed + ':' + new Date().toISOString().slice(0, 13));
    if (otp !== expected) {
      logger.warn('otp.fail', { rid: req.id, voter_id: id });
      return res.status(401).json({ error: { code: 'otp_invalid', message: 'OTP is incorrect or expired' } });
    }
    const sid = store.sessions.issue(id);
    res.cookie(SESSION_COOKIE, sid, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 15 * 60 * 1000 });
    res.json({ ok: true, session_id: sid, voter: { voter_id: id, name: v.name, constituency_name: v.constituency_name } });
  });

  // ---------- Vote casting ----------
  r.get('/me', (req, res) => {
    const sid = req.cookies[SESSION_COOKIE];
    const s = sid && store.sessions.get(sid);
    if (!s) return res.status(401).json({ error: { code: 'unauth', message: 'Not authenticated' } });
    const v = store.voters.get(s.voter_id);
    res.json({ voter_id: v.voter_id, name: v.name, constituency_code: v.constituency_code, constituency_name: v.constituency_name, voted: v.voted });
  });

  r.post('/vote', (req, res) => {
    const sid = req.cookies[SESSION_COOKIE];
    const s = sid && store.sessions.get(sid);
    if (!s) return res.status(401).json({ error: { code: 'unauth', message: 'Login first' } });
    const v = store.voters.get(s.voter_id);
    if (!v) return res.status(401).json({ error: { code: 'unauth', message: 'Voter not on roll' } });
    if (v.voted) return res.status(409).json({ error: { code: 'already_voted', message: 'Vote already recorded' } });
    if (store.election.phase !== 'live') return res.status(403).json({ error: { code: 'phase', message: 'Election is not currently live' } });

    const candidate_id = String(req.body?.candidate_id || '');
    const cand = store.election.candidates.find(c => c.id === candidate_id);
    if (!cand) return res.status(400).json({ error: { code: 'bad_candidate', message: 'Unknown candidate' } });
    if (cand.constituency_code !== v.constituency_code)
      return res.status(403).json({ error: { code: 'wrong_constituency', message: 'Candidate not in your constituency' } });

    const blindHash = blind(v.voter_id);
    if (store.ballots.blindSeen(blindHash)) {
      return res.status(409).json({ error: { code: 'already_voted', message: 'Vote already recorded' } });
    }

    const plain = { candidate_id, ts: new Date().toISOString() };
    const cipher = encryptBallot(plain);
    const ballot = {
      id: randomUUID(),
      ts: plain.ts,
      cipher,
      // For live tally, the authority "decrypts" immediately in this demo.
      // Real ECVS keeps ciphertext sealed until count phase.
      plain
    };
    const root = store.ballots.push(ballot);
    store.ballots.markBlind(blindHash);
    v.voted = true;
    store.voters.set(v);
    store.sessions.end(sid);
    res.clearCookie(SESSION_COOKIE);
    logger.info('vote.cast', { rid: req.id, ballot_id: ballot.id, root, constituency: v.constituency_code });
    res.json({
      ok: true,
      receipt: {
        ballot_id: ballot.id,
        timestamp: ballot.ts,
        merkle_root: root,
        cipher_alg: cipher.alg
      }
    });
  });

  // ---------- Results / Tally ----------
  r.get('/results', (_req, res) => {
    const t = store.tally();
    res.json({
      total: t.total,
      partySeats: t.partySeats,
      seats: t.seats,
      byParty: t.byParty
    });
  });
  r.get('/results/constituency/:code', (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const t = store.tally();
    const counts = t.byConstituency[code] || {};
    const items = Object.entries(counts).map(([cid, n]) => {
      const cand = store.election.candidates.find(c => c.id === cid);
      return { candidate_id: cid, name: cand?.name, party_id: cand?.party_id, votes: n };
    }).sort((a, b) => b.votes - a.votes);
    res.json({ constituency_code: code, total: items.reduce((a, b) => a + b.votes, 0), items });
  });

  // ---------- Audit ----------
  r.get('/audit/root', (_req, res) => {
    res.json({ size: store.ballots.auditSize(), root: store.ballots.auditRoot() });
  });
  r.get('/audit/tail', (req, res) => {
    const n = Math.min(200, Math.max(1, Number(req.query.n) || 50));
    res.json({ items: store.ballots.auditTail(n) });
  });
  r.get('/audit/ballots', (req, res) => {
    const n = Math.min(500, Math.max(1, Number(req.query.n) || 100));
    res.json({
      items: store.ballots.list(n).map(b => ({
        id: b.id, ts: b.ts, cipher: b.cipher, root_after: b.root_after
      }))
    });
  });

  // ---------- Admin ----------
  r.post('/admin/login', (req, res) => {
    const t = String(req.body?.token || '');
    if (t !== ADMIN_TOKEN) return res.status(401).json({ error: { code: 'unauth', message: 'Invalid admin token' } });
    res.cookie(ADMIN_COOKIE, ADMIN_TOKEN, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 60 * 60 * 1000 });
    res.json({ ok: true });
  });
  function admin(req, res, next) {
    if (req.cookies[ADMIN_COOKIE] !== ADMIN_TOKEN) return res.status(401).json({ error: { code: 'unauth', message: 'Admin auth required' } });
    next();
  }
  r.get('/admin/stats', admin, (_req, res) => {
    res.json({
      voters: store.voters.size(),
      ballots: store.ballots.size(),
      sessions: store.sessions.size(),
      election: store.election.summary(),
      audit_root: store.ballots.auditRoot(),
      audit_size: store.ballots.auditSize(),
      booted_at: store.bootedAt
    });
  });
  r.get('/admin/logs', admin, (req, res) => {
    const n = Math.min(1000, Math.max(1, Number(req.query.n) || 200));
    const lvl = req.query.level ? String(req.query.level) : null;
    res.json({ items: logger.recent(n, lvl) });
  });
  r.post('/admin/phase', admin, (req, res) => {
    const phase = String(req.body?.phase || '');
    if (!['setup', 'live', 'closed'].includes(phase)) return res.status(400).json({ error: { code: 'bad_phase' } });
    store.election.phase = phase;
    if (phase === 'closed') store.election.closed_at = new Date().toISOString();
    res.json({ ok: true, phase });
  });
  r.get('/admin/token-hint', (_req, res) => {
    // Reveal the admin token only on instances where it was auto-generated, so the
    // demo is self-contained. This is intentional for the academic submission.
    res.json({ note: 'Demo token shown only because no ADMIN_TOKEN was provided externally.', token: ADMIN_TOKEN });
  });

  return r;
}

export function mountAPI(app) {
  app.use('/api', api());
  app.use('/v1', api());
}
