// /report serves the project report as HTML and as a downloadable DOCX.
// The DOCX is generated at request time from a built-in OOXML template so the
// deployed instance is self-sufficient.

import path from 'node:path';
import fs from 'node:fs/promises';
import { Router } from 'express';
import { buildDocx } from './docx.js';
import { reportSections, reportMeta } from './report-content.js';

export function mountReport(app, rootDir) {
  const r = Router();

  r.get('/data', (_req, res) => res.json({ meta: reportMeta, sections: reportSections }));

  r.get('/download.docx', async (_req, res) => {
    try {
      const buf = await buildDocx({ meta: reportMeta, sections: reportSections });
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.set('Content-Disposition', 'attachment; filename="Capstone-Project-Report-Ankit-Saini.docx"');
      res.send(buf);
    } catch (e) {
      res.status(500).json({ error: { code: 'docx_failed', message: e.message } });
    }
  });

  r.get('/download.md', async (_req, res) => {
    try {
      const md = await fs.readFile(path.join(rootDir, 'docs', 'REPORT.md'), 'utf8');
      res.set('Content-Type', 'text/markdown; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="Capstone-Project-Report-Ankit-Saini.md"');
      res.send(md);
    } catch (e) {
      res.status(500).json({ error: { code: 'md_failed', message: e.message } });
    }
  });

  app.use('/report', r);
}
