let logs = JSON.parse(localStorage.getItem('logs')) || [];
let riwayatFisik = JSON.parse(localStorage.getItem('riwayatFisik')) || [];
let profile = JSON.parse(localStorage.getItem('profile')) || { name: '', age: 0, weight: 0, height: 0, bmr: 0, tdee: 0 };
let currentPage = 1;
const rowsPerPage = 10;
let myChart = null; 

const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTanggalIndo = (tglStr) => {
    const d = new Date(tglStr);
    return isNaN(d.getTime()) ? (tglStr || "N/A") : d.toLocaleDateString('id-ID');
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'dashboard') updateUI();
}

function updateChart(valIn, valOut) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;
    const chartData = {
        labels: ['Masuk', 'Keluar'],
        datasets: [{
            data: [valIn || 0.1, valOut || 0.1],
            backgroundColor: (valIn === 0 && valOut === 0) ? ['#eee', '#eee'] : ['#d9534f', '#28a745'],
            borderWidth: 0, cutout: '80%'
        }]
    };
    if (myChart === null) {
        myChart = new Chart(ctx, { type: 'doughnut', data: chartData, options: { responsive: true, plugins: { legend: { display: false } } } });
    } else {
        myChart.data.datasets[0].data = [valIn || 0.1, valOut || 0.1];
        myChart.data.datasets[0].backgroundColor = (valIn === 0 && valOut === 0) ? ['#eee', '#eee'] : ['#d9534f', '#28a745'];
        myChart.update();
    }
}

function updateUI() {
    const tglToday = getTodayKey();
    let totalIn = 0, totalOut = 0;
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = '';
        logs.forEach(item => {
            if (item.tanggal === tglToday) {
                if (item.tipe === 'in') totalIn += item.kalori; else totalOut += item.kalori;
                tbody.innerHTML += `<tr><td class="wrap-text">${item.nama}</td><td style="text-align:center">${item.tipe==='in'?'Masuk':'Keluar'}</td>
                    <td style="color:${item.tipe==='in'?'#d9534f':'#28a745'}; font-weight:bold; text-align:center;">${item.tipe==='in'?'+':'-'}${item.kalori}</td></tr>`;
            }
        });
    }

    const net = totalIn - totalOut;
    document.getElementById('dashIn').innerText = totalIn;
    document.getElementById('dashOut').innerText = totalOut;
    document.getElementById('dashNet').innerText = `${net} kcal`;
    const statusEl = document.getElementById('dashStatus');
    statusEl.innerText = net < 0 ? "(Defisit)" : net > 0 ? "(Surplus)" : "(Seimbang)";
    statusEl.style.color = net < 0 ? "#28a745" : net > 0 ? "#d9534f" : "#007bff";
    updateChart(totalIn, totalOut);

    const archiveBody = document.getElementById('archiveTableBody');
    if (archiveBody) {
        archiveBody.innerHTML = '';
        let sorted = logs.map((it, i) => ({...it, originalIndex: i})).sort((a,b) => b.tanggal.localeCompare(a.tanggal) || b.timestamp - a.timestamp);
        sorted.slice((currentPage-1)*rowsPerPage, currentPage*rowsPerPage).forEach(item => {
            archiveBody.innerHTML += `<tr><td><small>${formatTanggalIndo(item.tanggal)}</small></td><td class="wrap-text">${item.nama}</td>
                <td style="text-align:center">${item.tipe==='in'?'In':'Out'}</td><td style="text-align:center">${item.kalori}</td>
                <td style="text-align:center"><button class="btn-edit" onclick="bukaEdit(${item.originalIndex})">✎</button>
                <button class="btn-hapus" onclick="hapusLog(${item.originalIndex})">x</button></td></tr>`;
        });
        renderPagination(sorted.length);
    }
    renderRekapAndProfile();
}

function renderRekapAndProfile() {
    const rekapBody = document.getElementById('rekapTableBody');
    if (rekapBody) {
        rekapBody.innerHTML = '';
        const rekap = {};
        logs.forEach(it => { if(!rekap[it.tanggal]) rekap[it.tanggal]={in:0, out:0}; rekap[it.tanggal][it.tipe]+=it.kalori; });
        Object.keys(rekap).sort((a,b) => b.localeCompare(a)).forEach(tgl => {
            const d = rekap[tgl]; const raw = d.in - d.out;
            const col = raw < 0 ? '#28a745' : raw > 0 ? '#d9534f' : '#007bff';
            rekapBody.innerHTML += `<tr><td><b>${formatTanggalIndo(tgl)}</b></td><td>${d.in}</td><td>${d.out}</td>
                <td style="color:${col}; font-weight:bold">${Math.abs(raw)}</td><td style="color:${col}; font-weight:bold">${raw < 0 ? 'Defisit':'Surplus'}</td></tr>`;
        });
    }

const bmrBody = document.getElementById('bmrTableBody');
    if (bmrBody) {
        bmrBody.innerHTML = '';
        let sortedBmr = riwayatFisik.map((it, i) => ({...it, originalIndex: i})).sort((a,b) => b.tanggal.localeCompare(a.tanggal));
        sortedBmr.forEach(it => {
            bmrBody.innerHTML += `<tr>
                <td>${formatTanggalIndo(it.tanggal)}</td>
                <td>${it.berat} kg</td>
                <td style="color:#007bff; font-weight:bold;">${it.bmr || '-'}</td> <td style="color:#28a745; font-weight:bold;">${it.tdee}</td>
                <td>
                    <button class="btn-edit" onclick="bukaEditBmr(${it.originalIndex})">✎</button>
                    <button class="btn-hapus" onclick="hapusBMR(${it.originalIndex})">x</button>
                </td>
            </tr>`;
        });
    }

    document.getElementById('profName').value = profile.name || '';
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    set('dispAge', profile.age ? profile.age + " Thn" : "-");
    set('dispWeight', profile.weight ? profile.weight + " kg" : "-");
    set('dispHeight', profile.height ? profile.height + " cm" : "-");
    set('dispBmr', profile.bmr ? profile.bmr + " kcal" : "-");
    set('dispTdee', profile.tdee ? profile.tdee + " kcal" : "-");
    if (profile.height) document.getElementById('idealWeight').innerText = ((profile.height - 100) * 0.9).toFixed(1);
}

function hitungBMR() {
    const w = parseFloat(document.getElementById('bmr-weight').value), h = parseFloat(document.getElementById('bmr-height').value), a = parseInt(document.getElementById('bmr-age').value);
    const g = document.getElementById('gender').value, act = parseFloat(document.getElementById('activity').value), tgl = document.getElementById('bmrDate').value || getTodayKey();
    if (!w || !h || !a) return alert("Lengkapi data!");
    let bmrVal = (10 * w) + (6.25 * h) - (5 * a) + (g === 'male' ? 5 : -161);
    let tdee = Math.round(bmrVal * act);
    riwayatFisik.push({ tanggal: tgl, berat: w, bmr: Math.round(bmrVal), tdee });
    profile = { ...profile, age: a, weight: w, height: h, bmr: Math.round(bmrVal), tdee };
    saveData(); updateUI(); alert("Data fisik diperbarui!");
}

function tambahItem() {
    const nama = document.getElementById('foodName').value;
    const tipe = document.getElementById('type').value;
    const kalori = parseInt(document.getElementById('calories').value);
    const inputDate = document.getElementById('inputDate').value || getTodayKey();
    if (!nama || isNaN(kalori)) return alert("Isi data!");
    logs.push({ tanggal: inputDate, nama, tipe, kalori, timestamp: new Date().getTime() });
    saveData(); updateUI();
    document.getElementById('foodName').value = ''; document.getElementById('calories').value = '';
}

function bukaEditBmr(i) {
    const it = riwayatFisik[i];
    document.getElementById('editBmrIndex').value = i;
    document.getElementById('editBmrDate').value = it.tanggal;
    document.getElementById('editBmrWeight').value = it.berat;
    document.getElementById('editBmrTdee').value = it.tdee;
    document.getElementById('editBmrModal').classList.add('active');
}
function tutupBmrModal() { document.getElementById('editBmrModal').classList.remove('active'); }
function simpanEditBmr() {
    const i = document.getElementById('editBmrIndex').value;
    riwayatFisik[i].tanggal = document.getElementById('editBmrDate').value;
    riwayatFisik[i].berat = parseFloat(document.getElementById('editBmrWeight').value);
    riwayatFisik[i].tdee = parseInt(document.getElementById('editBmrTdee').value);
    if (i == riwayatFisik.length - 1) { profile.weight = riwayatFisik[i].berat; profile.tdee = riwayatFisik[i].tdee; }
    saveData(); updateUI(); tutupBmrModal();
}

function bukaEdit(i) {
    const it = logs[i];
    document.getElementById('editIndex').value = i;
    document.getElementById('editDate').value = it.tanggal;
    document.getElementById('editName').value = it.nama;
    document.getElementById('editType').value = it.tipe;
    document.getElementById('editCalories').value = it.kalori;
    document.getElementById('editModal').classList.add('active');
}
function tutupModal() { document.getElementById('editModal').classList.remove('active'); }
function simpanEdit() {
    const i = document.getElementById('editIndex').value;
    logs[i] = { ...logs[i], tanggal: document.getElementById('editDate').value, nama: document.getElementById('editName').value, tipe: document.getElementById('editType').value, kalori: parseInt(document.getElementById('editCalories').value) };
    saveData(); updateUI(); tutupModal();
}

function exportData() {
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ logs, riwayatFisik, profile }));
    const dl = document.createElement('a'); dl.setAttribute("href", data); dl.setAttribute("download", `backup_${getTodayKey()}.json`); dl.click();
}
function importData(e) {
    const r = new FileReader(); r.onload = (ev) => {
        const d = JSON.parse(ev.target.result); logs = d.logs || []; riwayatFisik = d.riwayatFisik || []; profile = d.profile || profile;
        saveData(); updateUI(); alert("Backup Berhasil!");
    }; r.readAsText(e.target.files[0]);
}

function saveData() { localStorage.setItem('logs', JSON.stringify(logs)); localStorage.setItem('riwayatFisik', JSON.stringify(riwayatFisik)); localStorage.setItem('profile', JSON.stringify(profile)); }
function renderPagination(total) {
    const ctrl = document.getElementById('paginationCtrl'); const pages = Math.ceil(total / rowsPerPage);
    ctrl.innerHTML = ''; if (pages > 1) { for (let i = 1; i <= pages; i++) ctrl.innerHTML += `<button class="${i === currentPage ? 'active-page' : ''}" onclick="changePage(${i})">${i}</button>`; }
}
function changePage(p) { currentPage = p; updateUI(); }
function hapusLog(i) { if(confirm("Hapus?")) { logs.splice(i,1); saveData(); updateUI(); } }
function hapusBMR(i) { if(confirm("Hapus?")) { riwayatFisik.splice(i,1); saveData(); updateUI(); } }
function saveProfile() { profile.name = document.getElementById('profName').value; saveData(); }

function showPage(pageId) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Tampilkan halaman yang dipilih
    document.getElementById(pageId).classList.add('active');
    
    // Reset warna semua tombol navbar
    document.querySelectorAll('.navbar button').forEach(btn => btn.classList.remove('active-menu'));
    
    // Kasih warna biru ke tombol yang aktif
    const activeBtn = document.querySelector(`button[onclick="showPage('${pageId}')"]`);
    if (activeBtn) activeBtn.classList.add('active-menu');

    if (pageId === 'dashboard') updateUI();
}

// Panggil sekali saat load agar menu Dashboard langsung berwarna biru
document.addEventListener("DOMContentLoaded", () => {
    showPage('dashboard');
});

updateUI();