// In-memory store. Resets on cold start (MVP). All data ephemeral.
// Documented limitation: Cloud Run scale-to-zero with min-instances=0 means
// data persists only for the life of an instance. This is intentional for a
// transparent demo of the system architecture.

import { randomUUID, createHash } from 'node:crypto';
import { merkleRoot, append as merkleAppend } from './merkle.js';
import { CONSTITUENCIES, PARTIES } from './data.js';

function sha(s) { return createHash('sha256').update(s).digest('hex'); }

const bootedAt = new Date().toISOString();

// ---- Election state ----
const election = {
  id: 'lse-2029',
  title: 'Lok Sabha General Election 2029 (Demo)',
  type: 'general',
  phase: 'live', // setup | live | closed
  opened_at: bootedAt,
  closed_at: null,
  constituencies: CONSTITUENCIES,
  parties: PARTIES,
  candidates: buildCandidates(),
  summary() {
    return {
      id: this.id, title: this.title, phase: this.phase,
      opened_at: this.opened_at, closed_at: this.closed_at,
      constituencies: this.constituencies.length,
      parties: this.parties.length,
      candidates: this.candidates.length
    };
  }
};

function buildCandidates() {
  // Synthetic candidates: deterministic per constituency.
  const out = [];
  for (const c of CONSTITUENCIES) {
    // 4-6 candidates per seat
    const n = 4 + (c.code.charCodeAt(0) % 3);
    for (let i = 0; i < n; i++) {
      const party = PARTIES[(c.code.charCodeAt(1) + i) % PARTIES.length];
      out.push({
        id: `${c.code}-${i}`,
        constituency_code: c.code,
        name: synthName(c.code, i),
        party_id: party.id,
        symbol: party.symbol
      });
    }
    // NOTA always last
    out.push({
      id: `${c.code}-NOTA`, constituency_code: c.code,
      name: 'None of the Above', party_id: 'NOTA', symbol: '⊘'
    });
  }
  return out;
}

function synthName(code, i) {
  const first = ['Aarav','Vihaan','Aditya','Arjun','Sai','Rohan','Reyansh','Krishna','Ishaan','Kabir','Ananya','Diya','Saanvi','Aadhya','Pari','Ira','Myra','Sara','Kiara','Anika'];
  const last  = ['Sharma','Verma','Kumar','Singh','Patel','Reddy','Iyer','Nair','Das','Gupta','Khan','Bose','Pillai','Rao','Joshi','Mehta'];
  const a = first[(code.charCodeAt(0) + i*3) % first.length];
  const b = last[(code.charCodeAt(1) + i*5) % last.length];
  return `${a} ${b}`;
}

// ---- Voters: synthetic registry ----
const voters = new Map(); // voter_id -> {voter_id, name, dob, constituency_code, voted, masked}

function seedVoters() {
  // 10 voters per constituency by default — enough for demo, light on memory
  let i = 0;
  for (const c of CONSTITUENCIES) {
    for (let k = 0; k < 10; k++) {
      const voter_id = `${c.code}${String(k+1).padStart(4,'0')}`;
      const name = synthName(c.code, k+7);
      const dobYear = 1955 + ((c.code.charCodeAt(0) + k) % 50);
      voters.set(voter_id, {
        voter_id,
        name,
        dob: `${dobYear}-${String((k%12)+1).padStart(2,'0')}-${String(((k*3)%27)+1).padStart(2,'0')}`,
        constituency_code: c.code,
        constituency_name: c.name,
        state: c.state,
        otp_seed: sha(voter_id + ':' + bootedAt).slice(0, 6),
        voted: false
      });
      i++;
    }
  }
  return i;
}
const seeded = seedVoters();

// ---- Sessions: short-lived ephemeral ----
const sessions = new Map(); // sid -> {voter_id, exp}
const SESSION_TTL_MS = 15 * 60 * 1000;

function issueSession(voter_id) {
  const sid = randomUUID();
  sessions.set(sid, { voter_id, exp: Date.now() + SESSION_TTL_MS });
  return sid;
}
function getSession(sid) {
  const s = sessions.get(sid);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(sid); return null; }
  return s;
}
function endSession(sid) { sessions.delete(sid); }

// ---- Ballots: encrypted; tally derived ----
const ballots = []; // {id, ts, cipher, root_at_insert, h_voter_blind}
const seenBlinds = new Set(); // prevents double-vote without revealing voter
const auditLog = []; // append-only; merkle root computed over hashes

function ballotsApi() {
  return {
    size: () => ballots.length,
    list: (limit = 200) => ballots.slice(-limit).reverse(),
    push: (b) => {
      ballots.push(b);
      const h = sha(JSON.stringify({ id: b.id, ts: b.ts, cipher: b.cipher }));
      const root = merkleAppend(auditLog, h);
      b.root_after = root;
      return root;
    },
    blindSeen: (h) => seenBlinds.has(h),
    markBlind: (h) => seenBlinds.add(h),
    auditTail: (n=50) => auditLog.slice(-n),
    auditRoot: () => merkleRoot(auditLog),
    auditSize: () => auditLog.length
  };
}

// ---- Tally helpers ----
function tally() {
  const byCandidate = Object.create(null);
  const byConstituency = Object.create(null);
  const byParty = Object.create(null);

  for (const b of ballots) {
    if (!b.plain) continue; // tally only after decryption
    const cid = b.plain.candidate_id;
    const cand = election.candidates.find(c => c.id === cid);
    if (!cand) continue;
    byCandidate[cid] = (byCandidate[cid] || 0) + 1;
    byConstituency[cand.constituency_code] = byConstituency[cand.constituency_code] || {};
    byConstituency[cand.constituency_code][cid] = (byConstituency[cand.constituency_code][cid] || 0) + 1;
    byParty[cand.party_id] = (byParty[cand.party_id] || 0) + 1;
  }

  const seats = {};
  for (const [ccode, counts] of Object.entries(byConstituency)) {
    let winner = null, max = -1;
    for (const [cid, n] of Object.entries(counts)) {
      if (n > max) { max = n; winner = cid; }
    }
    if (winner) {
      const cand = election.candidates.find(c => c.id === winner);
      seats[ccode] = { candidate_id: winner, party_id: cand.party_id, votes: max };
    }
  }
  const partySeats = {};
  for (const s of Object.values(seats)) partySeats[s.party_id] = (partySeats[s.party_id] || 0) + 1;

  return { byCandidate, byParty, byConstituency, seats, partySeats, total: ballots.length };
}

export const store = {
  bootedAt,
  election,
  voters: {
    get: (id) => voters.get(id),
    has: (id) => voters.has(id),
    set: (v) => voters.set(v.voter_id, v),
    size: () => voters.size,
    sample: (n=20) => Array.from(voters.values()).slice(0, n).map(v => ({
      voter_id: v.voter_id, name: v.name, dob: v.dob,
      constituency_code: v.constituency_code, state: v.state
    }))
  },
  sessions: {
    issue: issueSession, get: getSession, end: endSession,
    size: () => sessions.size
  },
  ballots: ballotsApi(),
  tally,
  seeded
};
