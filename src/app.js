import { loadScores } from './parse.js';

const chartEl = document.getElementById('chart');
const detailsEl = document.getElementById('details');
const searchEl = document.getElementById('search');
const tagEl = document.getElementById('tag');
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
  const data = filtered.map(r => [patches.indexOf(r.patch), heroes.indexOf(r.hero), r.score, r]);

  const sorted = [...filtered].sort((a,b)=>b.score-a.score);
  const mostBuffed = sorted.find(r=>r.score>0);
  const mostNerfed = [...sorted].reverse().find(r=>r.score<0);
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
        const r = p.data[3];
        const score = r.score > 0 ? `+${r.score}` : `${r.score}`;
        return `<div style="max-width:360px"><b>${r.hero}</b> @ ${r.patch}<br/>impact: <b>${score}</b><br/><span style="color:#93a4c4">${r.tags.join(', ')}</span><hr style="border:none;border-top:1px solid #27314d"/>${r.changes.slice(0,3).join('<br/>')}</div>`;
      }
    },
    grid: { top: 40, left: 170, right: 20, bottom: 80 },
    xAxis: { type: 'category', data: patches, axisLabel: { rotate: 35 } },
    yAxis: {
      type: 'category',
      data: heroes,
      axisLabel: {
        formatter: (value) => `{${heroRichKey(value)}| } {name|${value}}`,
        rich,
        margin: 10
      }
    },
    visualMap: {
      min: -3, max: 3, calculable: true, orient: 'horizontal', left: 'center', bottom: 10,
      inRange: { color: ['#7f1d1d','#b91c1c','#f59e0b','#1f2937','#10b981','#22c55e','#15803d'] }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true, formatter: (p) => p.data[2] },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
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
  chart.on('click', (p) => renderDetails(p.data[3]));

  if (mostBuffed) renderDetails(mostBuffed);
}

async function main() {
  all = await loadScores();
  render();
}

searchEl.addEventListener('input', render);
tagEl.addEventListener('change', render);
window.addEventListener('resize', () => chart.resize());
main();