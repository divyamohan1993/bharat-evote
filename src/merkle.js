// Append-only Merkle audit log over SHA-256.
import { createHash } from 'node:crypto';
const H = (s) => createHash('sha256').update(s).digest('hex');

export function append(arr, leafHash) {
  arr.push(leafHash);
  return merkleRoot(arr);
}

export function merkleRoot(leaves) {
  if (leaves.length === 0) return H('');
  let layer = leaves.slice();
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const l = layer[i];
      const r = layer[i+1] || layer[i];
      next.push(H(l + r));
    }
    layer = next;
  }
  return layer[0];
}

export function proof(leaves, index) {
  if (index < 0 || index >= leaves.length) return null;
  const path = [];
  let layer = leaves.slice();
  let idx = index;
  while (layer.length > 1) {
    const sib = idx ^ 1;
    const node = layer[sib] ?? layer[idx];
    path.push({ side: idx % 2 === 0 ? 'right' : 'left', hash: node });
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const l = layer[i], r = layer[i+1] || layer[i];
      next.push(H(l + r));
    }
    layer = next;
    idx = Math.floor(idx / 2);
  }
  return path;
}

export function verify(leaf, path, root) {
  let h = leaf;
  for (const step of path) {
    h = step.side === 'left' ? H(step.hash + h) : H(h + step.hash);
  }
  return h === root;
}
