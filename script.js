const app = {
    plan: JSON.parse(localStorage.getItem('diet_v3')) || {},
    foodDB: JSON.parse(localStorage.getItem('food_db')) || {},
    weight: JSON.parse(localStorage.getItem('weight_v2')) || [],
    currentDay: 'lunedi',
    meals: ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena', 'extra'],
    charts: {},

    init() {
        // Inizializzazione struttura se vuota
        const days = ['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'];
        days.forEach(d => {
            if(!this.plan[d]) this.plan[d] = {};
            this.meals.forEach(m => { if(!this.plan[d][m]) this.plan[d][m] = []; });
        });

        this.initCharts();
        this.updateDatalist();
        this.update();
    },

    update() {
        this.calculateStats();
        this.renderMeals();
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

        if(!name || !qty || isNaN(k)) return alert("Dati incompleti");

        const item = {
            id: Date.now(), name, qty,
            kcal: (k * qty / 100).toFixed(1),
            c: (c * qty / 100).toFixed(1),
            p: (p * qty / 100).toFixed(1),
            f: (f * qty / 100).toFixed(1)
        };
        this.plan[this.currentDay][meal].push(item);
        this.foodDB[name.toLowerCase()] = { name, kcal: k, c, p, f };
        
        localStorage.setItem('food_db', JSON.stringify(this.foodDB));
        this.updateDatalist();
        this.update();
        ['search-input','qty-input','in-kcal','in-carb','in-pro','in-fat'].forEach(id => document.getElementById(id).value = "");
    },

    calculateStats() {
        let t = { kcal: 0, c: 0, p: 0, f: 0 };
        this.meals.forEach(m => {
            this.plan[this.currentDay][m].forEach(i => {
                t.kcal += parseFloat(i.kcal); t.c += parseFloat(i.c); t.p += parseFloat(i.p); t.f += parseFloat(i.f);
            });
        });

        const tk = parseFloat(document.getElementById('target-kcal').value) || 1;
        const tc = parseFloat(document.getElementById('target-carbs').value) || 1;
        const tp = parseFloat(document.getElementById('target-pro').value) || 1;
        const tf = parseFloat(document.getElementById('target-fat').value) || 1;

        document.getElementById('perc-c').innerText = ((tc*4/tk)*100).toFixed(0) + "%";
        document.getElementById('perc-p').innerText = ((tp*4/tk)*100).toFixed(0) + "%";
        document.getElementById('perc-f').innerText = ((tf*9/tk)*100).toFixed(0) + "%";

        document.getElementById('bar-fill').style.width = Math.min((t.kcal / tk * 100), 100) + "%";
        document.getElementById('kcal-label').innerText = `${t.kcal.toFixed(0)} / ${tk.toFixed(0)} kcal`;

        if(this.charts.macro) {
            this.charts.macro.data.datasets[0].data = [t.c, t.p, t.f];
            this.charts.macro.update();
        }
    },

    renderMeals() {
        const cont = document.getElementById('meals-list');
        cont.innerHTML = '';
        this.meals.forEach(m => {
            let mT = { kcal: 0, c: 0, p: 0, f: 0 };
            let html = `<div class="meal-card"><h3>${m.toUpperCase()}</h3><table>`;
            this.plan[this.currentDay][m].forEach((f, i) => {
                mT.kcal += parseFloat(f.kcal); mT.c += parseFloat(f.c); mT.p += parseFloat(f.p); mT.f += parseFloat(f.f);
                html += `<tr><td><strong>${f.name}</strong><br><small>${f.qty}g</small></td><td style="text-align:right; font-size:10px;"><span style="color:var(--d)">C:${f.c}</span> <span style="color:var(--p)">P:${f.p}</span> <span style="color:#f39c12">G:${f.f}</span><br><strong>${f.kcal}k</strong></td><td style="text-align:right"><button onclick="app.remove('${m}', ${i})" style="border:none; background:none; color:red; font-size:16px;">×</button></td></tr>`;
            });
            if (mT.kcal > 0) {
                html += `<tr style="background:#f9f9f9; font-weight:bold;"><td>TOTALE</td><td style="text-align:right; font-size:10px;">C:${mT.c.toFixed(1)} P:${mT.p.toFixed(1)} G:${mT.f.toFixed(1)}<br>${mT.kcal.toFixed(0)} kcal</td><td></td></tr>`;
            }
            cont.innerHTML += html + `</table></div>`;
        });
    },

    initCharts() {
        const mCtx = document.getElementById('macroChart');
        if(mCtx) {
            this.charts.macro = new Chart(mCtx, {
                type: 'doughnut',
                data: { labels: ['C','P','G'], datasets: [{ data:[0,0,0], backgroundColor:['#ff6384','#36a2eb','#ffce56'], borderWidth:0 }] },
                options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, cutout:'75%' }
            });
        }
        const wCtx = document.getElementById('weightChart');
        if(wCtx) {
            this.charts.weight = new Chart(wCtx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'kg', data: [], borderColor: '#4a90e2', tension: 0.3 }] },
                options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{display:false}} }
            });
            this.updateWeightChart();
        }
    },

    updateWeightChart() {
        if(!this.charts.weight) return;
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

    remove(m, i) { this.plan[this.currentDay][m].splice(i, 1); this.update(); },
    changeDay() { this.currentDay = document.getElementById('day-select').value; this.update(); },
    resetWeek() { if(confirm("Resettare tutti i pasti?")) { Object.keys(this.plan).forEach(d => this.meals.forEach(m => this.plan[d][m] = [])); this.update(); } },
    
    updateDatalist() {
        document.getElementById('food-database').innerHTML = Object.keys(this.foodDB).map(k => `<option value="${this.foodDB[k].name}">`).join('');
        this.renderDBEditor();
    },

    renderDBEditor() {
        const container = document.getElementById('db-list-container');
        container.innerHTML = '';
        Object.keys(this.foodDB).sort().forEach(k => {
            const entry = this.foodDB[k];
            const div = document.createElement('div');
            div.className = 'db-item';
            div.innerHTML = `<span>${entry.name}</span> <div><button onclick="app.editDBEntry('${k}')">✏️</button><button onclick="app.deleteDBEntry('${k}')">🗑️</button></div>`;
            container.appendChild(div);
        });
    },

    editDBEntry(k) {
        const e = this.foodDB[k];
        document.getElementById('search-input').value = e.name;
        document.getElementById('in-kcal').value = e.kcal;
        document.getElementById('in-carb').value = e.c;
        document.getElementById('in-pro').value = e.p;
        document.getElementById('in-fat').value = e.f;
        window.scrollTo(0,0);
    },

    deleteDBEntry(k) { if(confirm("Eliminare?")) { delete this.foodDB[k]; localStorage.setItem('food_db', JSON.stringify(this.foodDB)); this.updateDatalist(); } },
    
    convert() {
        const v = document.getElementById('conv-val').value;
        const r = document.getElementById('conv-type').value;
        document.getElementById('conv-res').innerText = `Peso stimato: ${(v*r).toFixed(0)}g`;
    },

    exportPDF() { window.print(); }
};

window.onload = () => app.init();