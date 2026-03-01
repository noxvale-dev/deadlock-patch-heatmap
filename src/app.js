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
  const maxVisibleColumns = 6;
  const initialEnd = patches.length > maxVisibleColumns
    ? Math.max(15, (maxVisibleColumns / patches.length) * 100)
    : 100;
  kpiHeroesEl.textContent = String(heroes.length);
  kpiBuffedEl.textContent = mostBuffed ? `${mostBuffed.hero} (${mostBuffed.score > 0 ? '+' : ''}${mostBuffed.score})` : 'None';
  kpiNerfedEl.textContent = mostNerfed ? `${mostNerfed.hero} (${mostNerfed.score})` : 'None';

  const rich = {
    name: { color: '#dbe7ff', align: 'left', padding: [0, 0, 0, 6], fontSize: 11 }
  };
  for (const h of heroes) {
    const key = heroRichKey(h);
    rich[key] = {
      height: 16,
      width: 16,
      align: 'center',
      backgroundColor: { image: heroImage(h) },
      borderRadius: 3
    };
  }

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
    grid: { top: 40, left: 170, right: 20, bottom: 120 },
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
        formatter: (value) => `{${heroRichKey(value)}| } {name|${value}}`,
        rich,
        margin: 10
      }
    },
    visualMap: {
      show: false,
      min: -3,
      max: 3,
      inRange: { color: ['#7f1d1d','#b91c1c','#f59e0b','#334155','#10b981','#22c55e','#15803d'] }
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: initialEnd,
        height: 12,
        bottom: 88,
        borderColor: '#27314d',
        fillerColor: 'rgba(59,130,246,0.25)'
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        start: 0,
        end: initialEnd
      }
    ],
    series: [{
      type: 'heatmap',
      data,
      label: { show: false },
      itemStyle: {
        borderColor: '#0b1020',
        borderWidth: 1,
        color: (p) => {
          const v = Number(p.data?.value?.[2] ?? 0);
          if (v >= 3) return '#15803d';
          if (v === 2) return '#22c55e';
          if (v === 1) return '#10b981';
          if (v === 0) return '#334155';
          if (v === -1) return '#f59e0b';
          if (v === -2) return '#b91c1c';
          return '#7f1d1d';
        }
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.6)', borderColor: '#e5e7eb', borderWidth: 1 } }
    }]
  });

  const renderDetails = (r) => {
    const img = heroImage(r.hero);
    detailsEl.innerHTML = `
      <div class="hero-line">
        <img src="${img}" onerror="this.onerror=null;this.src='./data/hero-images/placeholder.svg'" alt="${r.hero}" />
        <div>
          <div class="hero-name">${r.hero} @ ${r.patch}</div>
          <div class="muted">score: ${r.score > 0 ? '+' : ''}${r.score} · tags: ${r.tags.join(', ')}</div>
        </div>
      </div>
      <div>- ${r.changes.join('<br/>- ')}</div>
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