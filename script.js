const app = {
    plan: JSON.parse(localStorage.getItem('diet_v3')) || {
        lunedi: {}, martedi: {}, mercoledi: {}, giovedi: {}, venerdi: {}, sabato: {}, domenica: {}
    },
    foodDB: JSON.parse(localStorage.getItem('food_db')) || {},
    weight: JSON.parse(localStorage.getItem('weight_v2')) || [],
    currentDay: 'lunedi',
    meals: ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena', 'extra'],
    charts: {},

    init() {
        Object.keys(this.plan).forEach(d => {
            this.meals.forEach(m => { if(!this.plan[d][m]) this.plan[d][m] = []; });
        });
        this.initCharts();
        this.updateDatalist();
        this.update();
    },

    update() {
        this.calculateStats();
        this.renderMeals();
        this.renderShopping();
        localStorage.setItem('diet_v3', JSON.stringify(this.plan));
    },

    checkDatabase(name) {
        const entry = this.foodDB[name.toLowerCase()];
        if (entry) {
            document.getElementById('in-kcal').value = entry.kcal;
            document.getElementById('in-carb').value = entry.c;
            document.getElementById('in-pro').value = entry.p;
            document.getElementById('in-fat').value = entry.f;
        }
    },

    addManual() {
        const name = document.getElementById('search-input').value.trim();
        const qty = parseFloat(document.getElementById('qty-input').value);
        const meal = document.getElementById('meal-select').value;
        const k = parseFloat(document.getElementById('in-kcal').value);
        const c = parseFloat(document.getElementById('in-carb').value) || 0;
        const p = parseFloat(document.getElementById('in-pro').value) || 0;
        const f = parseFloat(document.getElementById('in-fat').value) || 0;

        if(!name || !qty || isNaN(k)) return alert("Compila i campi!");

        const item = {
            id: Date.now(), name, qty,
            kcal: (k * qty / 100).toFixed(1),
            c: (c * qty / 100).toFixed(1),
            p: (p * qty / 100).toFixed(1),
            f: (f * qty / 100).toFixed(1)
        };
        this.plan[this.currentDay][meal].push(item);

        if (!name.toUpperCase().startsWith("RICETTA:")) {
            this.foodDB[name.toLowerCase()] = { name, kcal: k, c, p, f };
            localStorage.setItem('food_db', JSON.stringify(this.foodDB));
        }
        this.updateDatalist();
        this.update();
        ['search-input','qty-input','in-kcal','in-carb','in-pro','in-fat'].forEach(id => document.getElementById(id).value = "");
    },

    deleteDBEntry(key) {
        if(confirm(`Eliminare ${this.foodDB[key].name}?`)) {
            delete this.foodDB[key];
            localStorage.setItem('food_db', JSON.stringify(this.foodDB));
            this.updateDatalist();
        }
    },

    editDBEntry(key) {
        const entry = this.foodDB[key];
        document.getElementById('search-input').value = entry.name;
        document.getElementById('in-kcal').value = entry.kcal;
        document.getElementById('in-carb').value = entry.c;
        document.getElementById('in-pro').value = entry.p;
        document.getElementById('in-fat').value = entry.f;
        window.scrollTo({top: 0, behavior: 'smooth'});
    },

    saveAsRecipe(mealName) {
        const items = this.plan[this.currentDay][mealName];
        if (items.length === 0) return;
        const rName = prompt("Nome Ricetta:");
        if (!rName) return;
        let rT = { kcal: 0, c: 0, p: 0, f: 0 };
        items.forEach(i => {
            rT.kcal += parseFloat(i.kcal); rT.c += parseFloat(i.c); rT.p += parseFloat(i.p); rT.f += parseFloat(i.f);
        });
        this.foodDB[rName.toLowerCase()] = { name: `RICETTA: ${rName}`, kcal: rT.kcal.toFixed(1), c: rT.c.toFixed(1), p: rT.p.toFixed(1), f: rT.f.toFixed(1) };
        localStorage.setItem('food_db', JSON.stringify(this.foodDB));
        this.updateDatalist();
        alert("Ricetta salvata nel DB!");
    },

    calculateStats() {
        let t = { kcal: 0, c: 0, p: 0, f: 0 };
        Object.values(this.plan[this.currentDay]).forEach(m => m.forEach(i => {
            t.kcal += parseFloat(i.kcal); t.c += parseFloat(i.c); t.p += parseFloat(i.p); t.f += parseFloat(i.f);
        }));

        const tk = parseFloat(document.getElementById('target-kcal').value) || 1;
        const tc = parseFloat(document.getElementById('target-carbs').value) || 0;
        const tp = parseFloat(document.getElementById('target-pro').value) || 0;
        const tf = parseFloat(document.getElementById('target-fat').value) || 0;

        document.getElementById('perc-c').innerText = ((tc*4/tk)*100).toFixed(0) + "%";
        document.getElementById('perc-p').innerText = ((tp*4/tk)*100).toFixed(0) + "%";
        document.getElementById('perc-f').innerText = ((tf*9/tk)*100).toFixed(0) + "%";

        document.getElementById('bar-fill').style.width = Math.min((t.kcal / tk * 100), 100) + "%";
        document.getElementById('kcal-label').innerText = `${t.kcal.toFixed(0)} / ${tk.toFixed(0)} kcal`;

        this.charts.macro.data.datasets[0].data = [t.c, t.p, t.f];
        this.charts.macro.update();
    },

    renderMeals() {
        const cont = document.getElementById('meals-list');
        cont.innerHTML = '';
        this.meals.forEach(m => {
            let mT = { kcal: 0, c: 0, p: 0, f: 0 };
            let html = `<div class="meal-card"><div style="display:flex; justify-content:space-between; align-items:center;"><h3>${m.toUpperCase()}</h3><button onclick="app.saveAsRecipe('${m}')" class="btn-mini" style="background:var(--s); color:white; border:none;">+ Ricetta</button></div><table>`;
            this.plan[this.currentDay][m].forEach((f, i) => {
                mT.kcal += parseFloat(f.kcal); mT.c += parseFloat(f.c); mT.p += parseFloat(f.p); mT.f += parseFloat(f.f);
                html += `<tr><td><strong>${f.name}</strong><br><small>${f.qty}g</small></td><td style="text-align:right; font-size:10px;"><span style="color:var(--d)">C:${parseFloat(f.c).toFixed(1)}</span> <span style="color:var(--p)">P:${parseFloat(f.p).toFixed(1)}</span> <span style="color:#f39c12">G:${parseFloat(f.f).toFixed(1)}</span><br><strong>${f.kcal}k</strong></td><td style="text-align:right"><button onclick="app.remove('${m}', ${i})" style="border:none; background:none; color:red; cursor:pointer; font-size:16px;">×</button></td></tr>`;
            });
            if (mT.kcal > 0) {
                html += `<tr style="background:#f9f9f9; font-weight:bold;"><td style="padding:4px">TOTALE</td><td style="text-align:right; font-size:10px;"><span style="color:var(--d)">C:${mT.c.toFixed(1)}</span> <span style="color:var(--p)">P:${mT.p.toFixed(1)}</span> <span style="color:#f39c12">G:${mT.f.toFixed(1)}</span><br>${mT.kcal.toFixed(0)}k</td><td></td></tr>`;
            }
            cont.innerHTML += html + `</table></div>`;
        });
    },

    initCharts() {
        this.charts.macro = new Chart(document.getElementById('macroChart'), {
            type: 'doughnut',
            data: { labels: ['C', 'P', 'F'], datasets: [{ data: [0,0,0], backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'], borderWidth: 0 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' }
        });
        this.charts.weight = new Chart(document.getElementById('weightChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'kg', data: [], borderColor: '#4a90e2', tension: 0.3, fill: true, backgroundColor: 'rgba(74,144,226,0.1)' }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false } } }
        });
        this.updateWeightChart();
    },

    updateWeightChart() {
        this.charts.weight.data.labels = this.weight.slice(-7).map(w => w.d);
        this.charts.weight.data.datasets[0].data = this.weight.slice(-7).map(w => w.v);
        this.charts.weight.update();
    },

    addWeight() {
        const v = document.getElementById('w-input').value;
        if(v) { 
            this.weight.push({ d: new Date().toLocaleDateString('it-IT'), v: parseFloat(v) }); 
            localStorage.setItem('weight_v2', JSON.stringify(this.weight));
            this.updateWeightChart();
            document.getElementById('w-input').value = "";
        }
    },

    resetWeek() {
        if(confirm("Vuoi cancellare tutti i pasti della settimana? (Il database alimenti rimarrà)")) {
            Object.keys(this.plan).forEach(d => this.meals.forEach(m => this.plan[d][m] = []));
            this.update();
        }
    },

    remove(m, i) { this.plan[this.currentDay][m].splice(i, 1); this.update(); },
    changeDay() { this.currentDay = document.getElementById('day-select').value; this.update(); },
    cloneDay() {
        const to = prompt("Copia in (es: martedi):");
        if(this.plan[to]) { this.plan[to] = JSON.parse(JSON.stringify(this.plan[this.currentDay])); this.update(); }
    },
    convert() {
        const v = document.getElementById('conv-val').value;
        const r = document.getElementById('conv-type').value;
        document.getElementById('conv-res').innerText = `Risultato: ${(v*r).toFixed(0)}g`;
    },
    renderShopping() {
        const list = {};
        Object.values(this.plan).forEach(d => Object.values(d).forEach(m => m.forEach(i => { list[i.name] = (list[i.name] || 0) + parseFloat(i.qty); })));
        document.getElementById('shopping-list').innerHTML = Object.entries(list).map(([n, q]) => `<li>${n}: ${q.toFixed(0)}g</li>`).join('');
    },
    exportShopping() {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([document.getElementById('shopping-list').innerText], {type: 'text/plain'})); a.download = 'spesa.txt'; a.click();
    },
    exportDB() {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(this.foodDB)], {type: 'application/json'})); a.download = 'database.json'; a.click();
    },
    importDB(e) {
        const r = new FileReader(); r.onload = (f) => { this.foodDB = {...this.foodDB, ...JSON.parse(f.target.result)}; localStorage.setItem('food_db', JSON.stringify(this.foodDB)); this.updateDatalist(); }; r.readAsText(e.target.files[0]);
    },
    updateDatalist() {
        document.getElementById('food-database').innerHTML = Object.keys(this.foodDB).map(k => `<option value="${this.foodDB[k].name}">`).join('');
        document.getElementById('db-count').innerText = Object.keys(this.foodDB).length;
        this.renderDBEditor();
    },
    renderDBEditor() {
        const container = document.getElementById('db-list-container');
        container.innerHTML = '';
        Object.keys(this.foodDB).sort().forEach(k => {
            const entry = this.foodDB[k];
            const div = document.createElement('div');
            div.className = 'db-item';
            div.innerHTML = `<span><strong>${entry.name}</strong></span> <div><button class="btn-edit" onclick="app.editDBEntry('${k}')">✏️</button><button class="btn-del" onclick="app.deleteDBEntry('${k}')">🗑️</button></div>`;
            container.appendChild(div);
        });
    },
    exportPDF() {
        const win = window.open('', '_blank');
        let h = `<html><head><style>body{font-family:sans-serif;padding:20px}.day{border:1px solid #eee;padding:15px;margin-bottom:20px;page-break-inside:avoid}h2{color:#4a90e2;border-bottom:2px solid #f2f2f2}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.box{background:#f9f9f9;padding:10px;border-radius:6px}table{width:100%;font-size:11px}.tot{background:#4a90e2;color:white;padding:8px;margin-top:10px;font-weight:bold;font-size:12px}</style></head><body><h1>Report Settimanale</h1>`;
        ['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'].forEach(g => {
            let t = {k:0,c:0,p:0,f:0};
            h += `<div class="day"><h2>${g.toUpperCase()}</h2><div class="grid">`;
            this.meals.forEach(m => {
                const items = this.plan[g][m];
                if(items.length > 0) {
                    h += `<div class="box"><strong>${m.toUpperCase()}</strong><table>`;
                    items.forEach(i => {
                        h += `<tr><td>${i.name} (${i.qty}g)</td><td style="text-align:right">${i.kcal}k</td></tr>`;
                        t.k += parseFloat(i.kcal); t.c += parseFloat(i.c); t.p += parseFloat(i.p); t.f += parseFloat(i.f);
                    });
                    h += `</table></div>`;
                }
            });
            h += `</div><div class="tot">GIORNO: ${t.k.toFixed(0)} kcal | C:${t.c.toFixed(0)}g | P:${t.p.toFixed(0)}g | F:${t.f.toFixed(0)}g</div></div>`;
        });
        win.document.write(h + `</body></html>`); win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    }
};
window.onload = () => app.init();