import { loadScores } from './parse.js';

const chartEl = document.getElementById('chart');
const detailsEl = document.getElementById('details');
const searchEl = document.getElementById('search');
const tagEl = document.getElementById('tag');
if (!window.echarts) {
  chartEl.innerHTML = '<div class="muted">Chart library failed to load. Hard refresh once; if still broken, report this message.</div>';
  throw new Error('ECharts not loaded');
}
const chart = echarts.init(chartEl);
const kpiHeroesEl = document.getElementById('kpiHeroes');
const kpiBuffedEl = document.getElementById('kpiBuffed');
const kpiNerfedEl = document.getElementById('kpiNerfed');
const prevPatchesBtn = document.getElementById('prevPatches');
const nextPatchesBtn = document.getElementById('nextPatches');
const patchWindowLabel = document.getElementById('patchWindowLabel');

let all = [];
let patchWindowStart = 0;
const PATCH_WINDOW_SIZE = 10;

function slugifyHero(name) {
  return name.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function heroImage(name) {
  const slug = slugifyHero(name);
  return `./data/hero-images/${slug}.png`;
}

function heroRichKey(name) {
  return `h_${slugifyHero(name).replace(/-/g, '_')}`;
}

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const tag = tagEl.value;
  const filtered = all.filter(r => (!q || r.hero.toLowerCase().includes(q)) && (tag === 'all' || r.tags.includes(tag)));

  const heroes = [...new Set(filtered.map(r => r.hero))];
  const allPatches = [...new Set(filtered.map(r => r.patch))].sort();

  if (patchWindowStart > Math.max(0, allPatches.length - PATCH_WINDOW_SIZE)) {
    patchWindowStart = Math.max(0, allPatches.length - PATCH_WINDOW_SIZE);
  }

  const visiblePatches = allPatches.slice(patchWindowStart, patchWindowStart + PATCH_WINDOW_SIZE);
  const patchSet = new Set(visiblePatches);

  const data = filtered
    .filter(r => patchSet.has(r.patch))
    .map(r => ({
      value: [visiblePatches.indexOf(r.patch), heroes.indexOf(r.hero), r.score],
      meta: r
    }));

  const sorted = [...filtered].sort((a,b)=>b.score-a.score);
  const mostBuffed = sorted.find(r=>r.score>0);
  const mostNerfed = [...sorted].reverse().find(r=>r.score<0);

  patchWindowLabel.textContent = `Patches ${patchWindowStart + 1}-${Math.min(allPatches.length, patchWindowStart + PATCH_WINDOW_SIZE)} of ${allPatches.length}`;
  prevPatchesBtn.disabled = patchWindowStart <= 0;
  nextPatchesBtn.disabled = patchWindowStart + PATCH_WINDOW_SIZE >= allPatches.length;

  // Keep cells closer to square by adapting chart height to row/column ratio.
  const gridLeft = 320;
  const gridRight = 20;
  const gridTop = 40;
  const gridBottom = 120;
  const usableWidth = Math.max(280, chartEl.clientWidth - gridLeft - gridRight);
  const baseCell = (usableWidth / Math.max(1, visiblePatches.length)) * 0.58;
  const cellSize = Math.max(14, Math.min(22, Math.round(baseCell)));
  const targetHeight = Math.max(720, Math.min(1700, Math.round(gridTop + gridBottom + heroes.length * cellSize)));
  chartEl.style.height = `${targetHeight}px`;
  chart.resize();
  kpiHeroesEl.textContent = String(heroes.length);
  kpiBuffedEl.textContent = mostBuffed ? `${mostBuffed.hero} (${mostBuffed.score > 0 ? '+' : ''}${mostBuffed.score})` : 'None';
  kpiNerfedEl.textContent = mostNerfed ? `${mostNerfed.hero} (${mostNerfed.score})` : 'None';

  const rich = {
    name: { color: '#dbe7ff', align: 'left', padding: [0, 0, 0, 12], fontSize: 15, fontWeight: 700, lineHeight: 20 }
  };
  for (const h of heroes) {
    const key = heroRichKey(h);
    rich[key] = {
      height: 30,
      width: 30,
      align: 'center',
      backgroundColor: { image: heroImage(h) },
      borderRadius: 3
    };
  }

  // Full viridis interpolation for -3..+3
  const viridisStops = ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'];

  chart.setOption({
    tooltip: {
      backgroundColor: '#0f1730',
      borderColor: '#334155',
      textStyle: { color: '#e5e7eb' },
      formatter: (p) => {
        const r = p.data?.meta;
        if (!r) return 'No data';
        const score = r.score > 0 ? `+${r.score}` : `${r.score}`;
        return `<div style="max-width:360px"><b>${r.hero}</b> @ ${r.patch}<br/>impact: <b>${score}</b><br/><span style="color:#93a4c4">${r.tags.join(', ')}</span><hr style="border:none;border-top:1px solid #27314d"/>${r.changes.slice(0,3).join('<br/>')}</div>`;
      }
    },
    grid: { top: gridTop, left: gridLeft, right: gridRight, bottom: gridBottom },
    xAxis: {
      type: 'category',
      data: visiblePatches,
      axisLabel: { rotate: 35 },
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      data: heroes,
      splitArea: { show: true },
      axisLabel: {
        interval: 0,
        hideOverlap: false,
        formatter: (value) => `{${heroRichKey(value)}| } {name|${value}}`,
        rich,
        margin: 12
      }
    },
    visualMap: {
      show: false,
      min: -3,
      max: 3,
      calculable: false,
      inRange: { color: viridisStops }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: false },
      itemStyle: {
        borderColor: '#0b1020',
        borderWidth: 7,
        borderRadius: 2
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.6)', borderColor: '#e5e7eb', borderWidth: 1 } }
    }]
  });

  const renderDetails = (r) => {
    const img = heroImage(r.hero);
    const changes = (r.changes || []).map(c => `<li>${c}</li>`).join('');
    const tags = (r.tags || []).map(t => `<span class="pill">${t}</span>`).join('');
    detailsEl.innerHTML = `
      <div class="hero-line">
        <img src="${img}" onerror="this.onerror=null;this.src='./data/hero-images/placeholder.svg'" alt="${r.hero}" />
        <div>
          <div class="hero-name">${r.hero} @ ${r.patch}</div>
          <div class="muted">score: ${r.score > 0 ? '+' : ''}${r.score}</div>
          <div style="margin-top:6px">${tags}</div>
        </div>
      </div>
      <ul>${changes}</ul>
    `;
  };

  chart.off('click');
  chart.on('click', (p) => {
    const r = p.data?.meta;
    if (r) renderDetails(r);
  });

  if (mostBuffed) renderDetails(mostBuffed);
}

async function main() {
  try {
    all = await loadScores();
    const initialPatches = [...new Set(all.map(r => r.patch))].sort();
    patchWindowStart = Math.max(0, initialPatches.length - PATCH_WINDOW_SIZE);
    if (!all.length) {
      chartEl.innerHTML = '<div class="muted">No data loaded. Check patch files/index.</div>';
      return;
    }
    render();
  } catch (e) {
    chartEl.innerHTML = `<div class="muted">Failed to load chart data: ${String(e)}</div>`;
    throw e;
  }
}

searchEl.addEventListener('input', () => { patchWindowStart = 0; render(); });
tagEl.addEventListener('change', () => { patchWindowStart = 0; render(); });
prevPatchesBtn?.addEventListener('click', () => {
  patchWindowStart = Math.max(0, patchWindowStart - PATCH_WINDOW_SIZE);
  render();
});
nextPatchesBtn?.addEventListener('click', () => {
  patchWindowStart = patchWindowStart + PATCH_WINDOW_SIZE;
  render();
});
window.addEventListener('resize', () => chart.resize());
main();