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

let all = [];

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
  const patches = [...new Set(filtered.map(r => r.patch))].sort();
  const data = filtered.map(r => ({
    value: [patches.indexOf(r.patch), heroes.indexOf(r.hero), r.score],
    meta: r
  }));

  const sorted = [...filtered].sort((a,b)=>b.score-a.score);
  const mostBuffed = sorted.find(r=>r.score>0);
  const mostNerfed = [...sorted].reverse().find(r=>r.score<0);

  // Keep cells closer to square by adapting chart height to row/column ratio.
  const gridLeft = 220;
  const gridRight = 20;
  const gridTop = 40;
  const gridBottom = 120;
  const usableWidth = Math.max(320, chartEl.clientWidth - gridLeft - gridRight);
  const cellSize = Math.max(10, Math.round((usableWidth / Math.max(1, patches.length)) * 0.72));
  const targetHeight = Math.max(640, Math.min(1600, Math.round(gridTop + gridBottom + heroes.length * cellSize)));
  chartEl.style.height = `${targetHeight}px`;
  chart.resize();
  kpiHeroesEl.textContent = String(heroes.length);
  kpiBuffedEl.textContent = mostBuffed ? `${mostBuffed.hero} (${mostBuffed.score > 0 ? '+' : ''}${mostBuffed.score})` : 'None';
  kpiNerfedEl.textContent = mostNerfed ? `${mostNerfed.hero} (${mostNerfed.score})` : 'None';

  const rich = {
    name: { color: '#dbe7ff', align: 'left', padding: [0, 0, 0, 8], fontSize: 13, fontWeight: 600 }
  };
  for (const h of heroes) {
    const key = heroRichKey(h);
    rich[key] = {
      height: 22,
      width: 22,
      align: 'center',
      backgroundColor: { image: heroImage(h) },
      borderRadius: 3
    };
  }

  // Viridis-inspired 7-step palette mapped to -3..+3
  const palette = {
    minus3: '#440154',
    minus2: '#46327e',
    minus1: '#365c8d',
    zero: '#277f8e',
    plus1: '#1fa187',
    plus2: '#4ac16d',
    plus3: '#a0da39'
  };

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
      data: patches,
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
        margin: 10
      }
    },
    visualMap: {
      show: false,
      min: -3,
      max: 3,
      inRange: { color: [palette.minus3, palette.minus2, palette.minus1, palette.zero, palette.plus1, palette.plus2, palette.plus3] }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: false },
      itemStyle: {
        borderColor: '#0b1020',
        borderWidth: 2,
        color: (p) => {
          const v = Number(p.data?.value?.[2] ?? 0);
          if (v >= 3) return palette.plus3;
          if (v === 2) return palette.plus2;
          if (v === 1) return palette.plus1;
          if (v === 0) return palette.zero;
          if (v === -1) return palette.minus1;
          if (v === -2) return palette.minus2;
          return palette.minus3;
        }
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

searchEl.addEventListener('input', render);
tagEl.addEventListener('change', render);
window.addEventListener('resize', () => chart.resize());
main();