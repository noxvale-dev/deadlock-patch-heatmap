import { loadScores } from './parse.js';

const chartEl = document.getElementById('chart');
const detailsEl = document.getElementById('details');
const searchEl = document.getElementById('search');
const tagEl = document.getElementById('tag');
const chart = echarts.init(chartEl);

let all = [];

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const tag = tagEl.value;
  const filtered = all.filter(r => (!q || r.hero.toLowerCase().includes(q)) && (tag === 'all' || r.tags.includes(tag)));

  const heroes = [...new Set(filtered.map(r => r.hero))];
  const patches = [...new Set(filtered.map(r => r.patch))].sort();
  const data = filtered.map(r => [patches.indexOf(r.patch), heroes.indexOf(r.hero), r.score, r]);

  chart.setOption({
    tooltip: {
      formatter: (p) => {
        const r = p.data[3];
        return `<b>${r.hero}</b> @ ${r.patch}<br/>score: <b>${r.score}</b><br/>${r.changes.slice(0,3).join('<br/>')}`;
      }
    },
    grid: { top: 40, left: 120, right: 20, bottom: 80 },
    xAxis: { type: 'category', data: patches, axisLabel: { rotate: 35 } },
    yAxis: { type: 'category', data: heroes },
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

  chart.off('click');
  chart.on('click', (p) => {
    const r = p.data[3];
    detailsEl.textContent = `${r.hero} @ ${r.patch}\nscore: ${r.score}\ntags: ${r.tags.join(', ')}\n\n- ${r.changes.join('\n- ')}`;
  });
}

async function main() {
  all = await loadScores();
  render();
}

searchEl.addEventListener('input', render);
tagEl.addEventListener('change', render);
window.addEventListener('resize', () => chart.resize());
main();