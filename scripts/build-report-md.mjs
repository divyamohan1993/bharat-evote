// Convert src/report-content.js → docs/REPORT.md
import { reportMeta, reportSections } from '../src/report-content.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const lines = [];
lines.push(`# ${reportMeta.titleLine1}`);
lines.push(`## ${reportMeta.titleLine2}`);
lines.push('');
lines.push('Synopsis submitted for the partial fulfilment of the degree of');
lines.push('**BACHELOR OF TECHNOLOGY (CSE — DATA SCIENCE)**');
lines.push('');
lines.push(`- **Name of Student:** ${reportMeta.student}`);
lines.push(`- **Registration Number:** ${reportMeta.registration}`);
lines.push(`- **Course with Specialization:** ${reportMeta.course}`);
lines.push(`- **Semester:** ${reportMeta.semester}`);
lines.push(`- **Capstone Mentor:** ${reportMeta.mentor}`);
lines.push(`- **School:** ${reportMeta.institution}`);
lines.push(`- **University:** ${reportMeta.university}`);
lines.push(`- **Submitted:** ${reportMeta.submitted_on}`);
lines.push('');
lines.push('---');
lines.push('');

for (const sec of reportSections) {
  lines.push(`## ${sec.title}`);
  lines.push('');
  for (const b of sec.blocks) {
    if (b.type === 'h2') { lines.push(`### ${b.text}`); lines.push(''); }
    else if (b.type === 'h3') { lines.push(`#### ${b.text}`); lines.push(''); }
    else if (b.type === 'bullet') {
      for (const item of b.items) lines.push(`- ${item}`);
      lines.push('');
    }
    else if (b.type === 'code') {
      lines.push('```');
      lines.push(b.text);
      lines.push('```');
      lines.push('');
    }
    else { lines.push(b.text || ''); lines.push(''); }
  }
  lines.push('');
}

const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../docs/REPORT.md');
await fs.writeFile(out, lines.join('\n'), 'utf8');
console.log('wrote', out, lines.length, 'lines');
