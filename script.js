let logs = JSON.parse(localStorage.getItem('logs')) || [];
let riwayatFisik = JSON.parse(localStorage.getItem('riwayatFisik')) || [];
let profile = JSON.parse(localStorage.getItem('profile')) || { name: '', age: 0, weight: 0, height: 0, bmr: 0, tdee: 0 };
let myChart = null;
let currentPage = 1;
const rowsPerPage = 10;

// --- CORE: ZONA WAKTU WIB ---
const getTodayKey = () => {
    const d = new Date();
    const wib = new Date(d.getTime() + (7 * 60 * 60 * 1000)); 
    return wib.toISOString().split('T')[0];
};

const formatTanggalIndo = (tgl) => {
    if(!tgl) return "-";
    const [y, m, d] = tgl.split('-');
    return `${d}/${m}/${y}`;
};

// --- NAVIGATION ---
const pagesOrder = ['dashboard', 'input-data', 'bmr-calc', 'profile'];

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.navbar button').forEach(btn => btn.classList.remove('active-menu'));
    const btnId = 'nav-' + pageId;
    const btn = document.getElementById(btnId);
    if(btn) btn.classList.add('active-menu');

    if (pageId === 'input-data') {
        const dateInput = document.getElementById('inputDate');
        if (dateInput) dateInput.value = getTodayKey();
    }

    updateUI();
    window.scrollTo(0,0);
}

// --- CORE FUNCTIONS ---
function updateUI() {
    const tglToday = getTodayKey();
    let totalIn = 0;
    let totalOut = 0;
    
    const tbody = document.getElementById('tableBody');
    if (tbody) tbody.innerHTML = '';

    logs.forEach(item => {
        if (item.tanggal === tglToday) {
            if (item.tipe === 'in') totalIn += item.kalori;
            else totalOut += item.kalori;

            if (tbody) {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.nama}</td>
                        <td style="text-align:center;">${item.tipe === 'in' ? 'In' : 'Out'}</td>
                        <td style="color:${item.tipe === 'in' ? '#d9534f' : '#28a745'}; font-weight:bold; text-align:center;">
                            ${item.tipe === 'in' ? '+' : '-'}${item.kalori}
                        </td>
                    </tr>`;
            }
        }
    });

    const net = totalIn - totalOut;
    document.getElementById('dashIn').innerText = totalIn;
    document.getElementById('dashOut').innerText = totalOut;
    document.getElementById('dashNet').innerText = `${Math.abs(net)} kcal`;
    
    const statusEl = document.getElementById('dashStatus');
    statusEl.innerText = net > 0 ? "(Surplus)" : net < 0 ? "(Defisit)" : "(Seimbang)";
    statusEl.style.color = net > 0 ? "#d9534f" : net < 0 ? "#28a745" : "#007bff";

    updateChart(totalIn, totalOut);
    renderArchive();
    renderRekapHarian();
    renderBmrHistory();
    renderProfileView();
}

function updateChart(vin, vout) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [vin || 0.1, vout || 0.1],
                backgroundColor: (vin===0 && vout===0) ? ['#eee','#eee'] : ['#d9534f', '#28a745'],
                borderWidth: 0, cutout: '80%'
            }]
        },
        options: { plugins: { legend: { display: false } } }
    });
}

function tambahItem() {
    const n = document.getElementById('foodName').value;
    const k = parseInt(document.getElementById('calories').value);
    const t = document.getElementById('type').value;
    const d = document.getElementById('inputDate').value || getTodayKey();
    if(!n || isNaN(k)) return alert("Isi data dengan benar!");
    logs.push({ tanggal: d, nama: n, tipe: t, kalori: k, ts: Date.now() });
    save(); updateUI();
    document.getElementById('foodName').value = ''; 
    document.getElementById('calories').value = '';
}

function renderArchive() {
    const body = document.getElementById('archiveTableBody');
    if(!body) return;
    body.innerHTML = '';

    let sorted = logs.map((it, i) => ({...it, originalIndex: i}))
                     .sort((a,b) => b.tanggal.localeCompare(a.tanggal) || b.ts - a.ts);

    const start = (currentPage - 1) * rowsPerPage;
    const paginatedItems = sorted.slice(start, start + rowsPerPage);

    paginatedItems.forEach(item => {
        let iconType = item.tipe === 'in' 
            ? `<span class="material-icons tipe-icon icon-in">arrow_downward</span>`
            : `<span class="material-icons tipe-icon icon-out">arrow_upward</span>`;

        body.innerHTML += `
            <tr>
                <td><small>${formatTanggalIndo(item.tanggal)}</small></td>
                <td class="wrap-text">${item.nama}</td>
                <td style="text-align:center;">${iconType}</td>
                <td style="text-align:center">${item.kalori}</td>
                <td style="text-align:center">
                    <button class="btn-edit" onclick="bukaEdit(${item.originalIndex})">✎</button>
                    <button class="btn-hapus" onclick="hapusLog(${item.originalIndex})">✖</button>
                </td>
            </tr>`;
    });
    renderPagination(sorted.length);
}

function renderRekapHarian() {
    const body = document.getElementById('rekapTableBody');
    if(!body) return; body.innerHTML = '';
    const rekap = {};
    logs.forEach(it => { 
        if(!rekap[it.tanggal]) rekap[it.tanggal]={in:0, out:0}; 
        rekap[it.tanggal][it.tipe]+=it.kalori; 
    });
    Object.keys(rekap).sort((a,b) => b.localeCompare(a)).forEach(tgl => {
        const d = rekap[tgl]; const net = d.in - d.out;
        const col = net < 0 ? '#28a745' : net > 0 ? '#d9534f' : '#007bff';
        body.innerHTML += `<tr><td><small>${formatTanggalIndo(tgl)}</small></td><td>${d.in}</td><td>${d.out}</td>
        <td style="color:${col}; font-weight:bold">${Math.abs(net)}</td><td style="color:${col}; font-size:0.8em">${net < 0 ? 'Defisit':'Surplus'}</td></tr>`;
    });
}

function hitungBMR() {
    const w = parseFloat(document.getElementById('bmr-weight').value), 
          h = parseFloat(document.getElementById('bmr-height').value), 
          a = parseInt(document.getElementById('bmr-age').value),
          g = document.getElementById('gender').value, 
          act = parseFloat(document.getElementById('activity').value), 
          tgl = document.getElementById('bmrDate').value || getTodayKey();
    if(!w || !h || !a) return alert("Lengkapi data!");
    let bmrVal = Math.round((10 * w) + (6.25 * h) - (5 * a) + (g === 'male' ? 5 : -161));
    let tdeeVal = Math.round(bmrVal * act);
    riwayatFisik.push({ tanggal: tgl, berat: w, bmr: bmrVal, tdee: tdeeVal });
    profile = { ...profile, weight: w, height: h, age: a, bmr: bmrVal, tdee: tdeeVal };
    save(); updateUI(); alert("Data fisik disimpan!");
}

function renderBmrHistory() {
    const body = document.getElementById('bmrTableBody');
    if(!body) return; body.innerHTML = '';
    [...riwayatFisik].sort((a,b) => b.tanggal.localeCompare(a.tanggal)).forEach((it) => {
        const realIdx = riwayatFisik.indexOf(it);
        body.innerHTML += `<tr><td><small>${formatTanggalIndo(it.tanggal)}</small></td><td>${it.berat} kg</td>
        <td style="color:#007bff; font-weight:bold">${it.bmr}</td><td style="color:#28a745; font-weight:bold">${it.tdee}</td>
        <td style="text-align:center;"><button class="btn-hapus" onclick="hapusBmr(${realIdx})">x</button></td></tr>`;
    });
}

function renderProfileView() {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    document.getElementById('profName').value = profile.name || '';
    set('dispAge', profile.age ? profile.age + " Thn" : "-");
    set('dispWeight', profile.weight ? profile.weight + " kg" : "-");
    set('dispHeight', profile.height ? profile.height + " cm" : "-");
    set('dispBmr', profile.bmr ? profile.bmr + " kcal" : "-");
    set('dispTdee', profile.tdee ? profile.tdee + " kcal" : "-");
    if(profile.height) document.getElementById('idealWeight').innerText = ((profile.height - 100) * 0.9).toFixed(1);
}

function bukaEdit(i) {
    const it = logs[i]; document.getElementById('editIndex').value = i;
    document.getElementById('editDate').value = it.tanggal; document.getElementById('editName').value = it.nama;
    document.getElementById('editType').value = it.tipe; document.getElementById('editCalories').value = it.kalori;
    document.getElementById('editModal').classList.add('active');
}
function tutupModal() { document.getElementById('editModal').classList.remove('active'); }
function simpanEdit() {
    const i = document.getElementById('editIndex').value;
    logs[i] = { ...logs[i], tanggal: document.getElementById('editDate').value, nama: document.getElementById('editName').value, tipe: document.getElementById('editType').value, kalori: parseInt(document.getElementById('editCalories').value) };
    save(); updateUI(); tutupModal();
}

function hapusLog(i) { if(confirm("Hapus aktivitas ini?")) { logs.splice(i,1); save(); updateUI(); } }
function hapusBmr(i) { if(confirm("Hapus data fisik ini?")) { riwayatFisik.splice(i,1); save(); updateUI(); } }
function saveProfile() { profile.name = document.getElementById('profName').value; save(); }
function save() { localStorage.setItem('logs', JSON.stringify(logs)); localStorage.setItem('riwayatFisik', JSON.stringify(riwayatFisik)); localStorage.setItem('profile', JSON.stringify(profile)); }

function renderPagination(totalItems) {
    const ctrl = document.getElementById('paginationCtrl');
    if (!ctrl) return;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    ctrl.innerHTML = '';
    if (totalPages <= 1) return;
    if (currentPage > 1) ctrl.innerHTML += `<button onclick="changePage(${currentPage - 1})">«</button>`;
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = (i === currentPage) ? 'class="active-page"' : '';
        ctrl.innerHTML += `<button ${activeClass} onclick="changePage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) ctrl.innerHTML += `<button onclick="changePage(${currentPage + 1})">»</button>`;
}
function changePage(p) { currentPage = p; renderArchive(); }

document.addEventListener('DOMContentLoaded', () => {
    showPage('dashboard');
});