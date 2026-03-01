const BUFF = ['increased','improved','reduced cooldown','faster','bonus','more'];
const NERF = ['decreased','reduced','increased cooldown','slower','less'];

function inferTags(line) {
  const s = line.toLowerCase();
  const t = [];
  if (/damage|attack|dps|crit/.test(s)) t.push('damage');
  if (/health|armor|shield|heal|surviv/.test(s)) t.push('survivability');
  if (/cooldown|stun|slow|range|mobility|dash|utility/.test(s)) t.push('utility');
  if (/gold|economy|farm|cost/.test(s)) t.push('economy');
  return t.length ? t : ['utility'];
}

function scoreLine(line) {
  const s = line.toLowerCase();
  let score = 0;
  if (BUFF.some(k => s.includes(k))) score += 1;
  if (NERF.some(k => s.includes(k))) score -= 1;
  if (/significant|massive|\d+%/.test(s)) score += Math.sign(score || 0);
  return score;
}

function parsePatchText(patch, text) {
  const out = [];
  const sections = text.split(/\n##\s*Hero:\s*/g);
  for (let i = 1; i < sections.length; i++) {
    const [heroLine, ...rest] = sections[i].split('\n');
    const hero = heroLine.trim();
    const lines = rest.filter(l => /^-\s+/.test(l)).map(l => l.replace(/^-\s+/, '').trim());
    if (!hero || !lines.length) continue;
    let score = 0;
    const tags = new Set();
    for (const ln of lines) {
      score += scoreLine(ln);
      inferTags(ln).forEach(t => tags.add(t));
    }
    if (score > 3) score = 3;
    if (score < -3) score = -3;
    out.push({ hero, patch, score, changes: lines, tags: [...tags] });
  }
  return out;
}

export async function loadScores() {
  const index = await fetch('./data/patches/index.json').then(r => r.json());
  const all = [];
  for (const p of index.patches) {
    const txt = await fetch(`./data/patches/${p.file}`).then(r => r.text());
    all.push(...parsePatchText(p.patch, txt));
  }
  return all;
}
