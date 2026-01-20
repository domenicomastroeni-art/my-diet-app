const initialDay = () => ({ colazione: [], spuntino: [], pranzo: [], merenda: [], cena: [], extra: [] });
let weeklyPlan = JSON.parse(localStorage.getItem('dietPlan')) || { lunedi: initialDay(), martedi: initialDay(), mercoledi: initialDay(), giovedi: initialDay(), venerdi: initialDay(), sabato: initialDay(), domenica: initialDay() };
let weightHistory = JSON.parse(localStorage.getItem('weightHistory')) || [];
let recipeDatabase = JSON.parse(localStorage.getItem('recipes')) || [];
let currentDay = "lunedi";
let macroChart, weightChart;

async function searchFood() {
    const query = document.getElementById('food-search').value;
    const qty = parseFloat(document.getElementById('quantity-input').value);
    const meal = document.getElementById('meal-type-select').value;
    if (!query) return;

    try {
        const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=1`);
        const data = await res.json();
        if (data.products.length > 0) {
            const p = data.products[0].nutriments;
            const entry = {
                name: data.products[0].product_name,
                qty,
                kcal: (p['energy-kcal_100g'] * qty / 100).toFixed(1),
                carbs: (p.carbohydrates_100g * qty / 100).toFixed(1),
                pro: (p.proteins_100g * qty / 100).toFixed(1),
                fat: (p.fat_100g * qty / 100).toFixed(1)
            };
            weeklyPlan[currentDay][meal].push(entry);
            save();
        }
    } catch (e) { alert("Errore connessione"); }
}

function save() {
    localStorage.setItem('dietPlan', JSON.stringify(weeklyPlan));
    updateStats();
    render();
}

function render() {
    const container = document.getElementById('meals-container');
    container.innerHTML = "";
    Object.keys(weeklyPlan[currentDay]).forEach(meal => {
        let html = `<div class="meal-block"><h3>${meal.toUpperCase()}</h3><table>`;
        weeklyPlan[currentDay][meal].forEach((item, i) => {
            html += `<tr><td>${item.name}</td><td>${item.qty}g</td><td>${item.kcal}k</td><td><button onclick="remove('${meal}', ${i})">x</button></td></tr>`;
        });
        container.innerHTML += html + `</table></div>`;
    });
    renderShoppingList();
}

function updateStats() {
    let t = { kcal: 0, c: 0, p: 0, f: 0 };
    Object.values(weeklyPlan[currentDay]).forEach(m => m.forEach(i => {
        t.kcal += parseFloat(i.kcal); t.c += parseFloat(i.carbs); t.p += parseFloat(i.pro); t.f += parseFloat(i.fat);
    }));

    const gk = document.getElementById('goal-kcal').value;
    document.getElementById('progress-bar-fill').style.width = Math.min((t.kcal / gk * 100), 100) + "%";
    document.getElementById('progress-text').innerText = `${t.kcal.toFixed(0)} / ${gk} kcal`;

    macroChart.data.datasets[0].data = [t.c, t.p, t.f];
    macroChart.update();
}

function remove(meal, i) { weeklyPlan[currentDay][meal].splice(i, 1); save(); }

function changeDay() { currentDay = document.getElementById('day-select').value; render(); updateStats(); }

function cloneDay() {
    const to = prompt("In quale giorno vuoi copiare? (es: martedi)");
    if (weeklyPlan[to]) { weeklyPlan[to] = JSON.parse(JSON.stringify(weeklyPlan[currentDay])); save(); }
}

function convertWeight() {
    const r = document.getElementById('conversion-type').value;
    const v = document.getElementById('conv-input').value;
    document.getElementById('conv-result').innerText = (v * r).toFixed(0) + "g";
}

function downloadShoppingList() {
    let txt = "LISTA SPESA:\n";
    document.querySelectorAll('#shopping-list li').forEach(li => txt += li.innerText + "\n");
    const blob = new Blob([txt], {type: "text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "spesa.txt"; a.click();
}

function renderShoppingList() {
    const list = {};
    Object.values(weeklyPlan).forEach(d => Object.values(d).forEach(m => m.forEach(i => {
        list[i.name] = (list[i.name] || 0) + parseFloat(i.qty);
    })));
    document.getElementById('shopping-list').innerHTML = Object.entries(list).map(([n, q]) => `<li>${n}: ${q.toFixed(0)}g</li>`).join('');
}

function addWeight() {
    const w = document.getElementById('weight-input').value;
    if(w) { weightHistory.push({ d: new Date().toLocaleDateString(), w }); localStorage.setItem('weightHistory', JSON.stringify(weightHistory)); updateWeightChart(); }
}

function updateWeightChart() {
    weightChart.data.labels = weightHistory.map(h => h.d);
    weightChart.data.datasets[0].data = weightHistory.map(h => h.w);
    weightChart.update();
}

window.onload = () => {
    macroChart = new Chart(document.getElementById('macroChart'), { type: 'doughnut', data: { labels: ['C', 'P', 'F'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'] }] } });
    weightChart = new Chart(document.getElementById('weightChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Peso', data: [], borderColor: '#4a90e2' }] } });
    render(); updateStats(); updateWeightChart();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
};