# Bharat eVote — Online Voting System for Indian Elections

> 🇮🇳 **Live demo:** https://bharat-evote.dmj.one
> 🎤 **Pitch deck:** https://bharat-evote.dmj.one/pitch/
> 📄 **Report:** https://bharat-evote.dmj.one/report/
> 💻 **Source:** https://github.com/ankit2807-tech/bharat-evote
>
> Capstone project of **Ankit Saini** (Reg. **GF202215717**), B.Tech CSE (Data Science),
> Yogananda School of AI, Computers and Data Sciences,
> Shoolini University of Biotechnology and Management Sciences, Solan, H.P., India.
> Capstone Mentor: **Ms Ishani Sharma**.

A remote, auditable, accessible voting system for Indian elections. Every part of
the deliverable — the live application, the cryptographic audit log, the
project report and the pitch deck — runs from a single Cloud Run container in
`asia-east1`, sized for a 1 GB-RAM phone on 3G.

| Endpoint | What it is |
|---|---|
| `/`            | Landing page (bilingual EN / HI) |
| `/auth.html`   | Voter ID + OTP sign-in |
| `/vote.html`   | Sealed-ballot casting flow |
| `/results.html`| Live tally — by party, seats, constituency |
| `/audit.html`  | Public Merkle root + ciphertext tail |
| `/admin.html`  | Phase control + SIEM-style log feed |
| `/pitch/`      | Web-based pitch deck (use ← / → keys) |
| `/report/`     | Live capstone report (DOCX + Markdown export) |
| `/api/...`     | REST API |
| `/health`      | Health probe |

## Quick start (local)

```bash
npm install
npm start
# open http://localhost:8080
```

## Deploy to Cloud Run

```bash
PROJECT_ID=$(gcloud config get-value project)
gcloud run deploy bharat-evote \
  --source . \
  --region asia-east1 \
  --min-instances 0 --max-instances 10 \
  --concurrency 80 --cpu 1 --memory 512Mi \
  --allow-unauthenticated
```

The production service is also mapped to the custom domain `bharat-evote.dmj.one`:
```bash
gcloud beta run domain-mappings create \
  --service bharat-evote --domain bharat-evote.dmj.one \
  --region asia-east1 --project dmjone
# Then add CNAME bharat-evote → ghs.googlehosted.com on Cloudflare (DNS-only, grey cloud).
```

The provided `scripts/deploy.sh` wraps the same command and prints the public URL.

## Architecture

Single Express service. In-memory voter roll, session table, ballot box and
Merkle audit log. Hybrid PQ-ready crypto: AES-256-GCM under an HKDF-SHA-256
derived key, with the symmetric leg structured to slot into a future ML-KEM-768
+ X25519 hybrid. Static UI is hand-written HTML + CSS + vanilla JavaScript with
zero npm dependencies on the client.

```
bharat-evote/
  server.js                 # Express bootstrap + routing
  src/
    logger.js               # JSON structured log + ring buffer
    store.js                # In-memory voters, sessions, ballots, election state
    data.js                 # Constituencies + parties seed
    crypto.js               # HKDF + AES-256-GCM + blind()
    merkle.js               # Append-only audit tree
    routes.js               # /api and /v1 endpoints
    report.js               # /report router
    docx.js                 # Self-contained DOCX builder
    report-content.js       # Single source of truth for the report
  public/
    index.html  auth.html  vote.html  results.html  admin.html  audit.html
    pitch/index.html        # Web-based PPT (arrow keys)
    report/index.html       # HTML report viewer
    css/  js/  i18n/  icons/
    sw.js  manifest.webmanifest
  Dockerfile  cloudbuild.yaml  scripts/deploy.sh
  docs/REPORT.md
```

## Security notes (MVP scope)

- **In-memory state** is intentional. It resets on cold start so reviewers can replay the entire flow without database setup. Production swaps `src/store.js` for a Cloud Spanner module behind the same interface.
- **OTPs** are returned in the demo response so reviewers can complete the flow without an SMS gateway. A single conditional gates this behind `NODE_ENV === 'production'` for a real deployment.
- **Crypto** is AES-256-GCM today. The roadmap calls for ML-KEM-768 + X25519 hybrid plus ML-DSA-65 Merkle-root signatures in future — see report §11.2.
- **PII never enters logs**. Voter IDs are masked in OTP-issuance log lines.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

- Election Commission of India — public reference materials on Indian electoral procedure
- The open-source community whose libraries and standards underpin this work
- **Ms Ishani Sharma** — Capstone Mentor, for sustained guidance and review at every stage
- Faculty of Yogananda School of AI, Computers and Data Sciences, Shoolini University
