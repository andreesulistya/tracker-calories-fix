let logs = JSON.parse(localStorage.getItem('logs')) || [];
let riwayatFisik = JSON.parse(localStorage.getItem('riwayatFisik')) || [];
let profile = JSON.parse(localStorage.getItem('profile')) || { name: '', age: 0, weight: 0, height: 0, bmr: 0, tdee: 0 };
let myChart = null;
let currentPage = 1;
const rowsPerPage = 10; // Jumlah baris per halaman

// --- SWIPE LOGIC (VERSI LEBIH STABIL) ---
const pagesOrder = ['dashboard', 'input-data', 'bmr-calc', 'profile'];
let touchstartX = 0;
let touchstartY = 0; // Tambah pendeteksi posisi awal Y
let touchendX = 0;
let touchendY = 0; // Tambah pendeteksi posisi akhir Y

function handleGesture() {
    const minDistance = 100; // Naikkan batas geser (Pixel) biar gak terlalu sensitif
    const diffX = touchendX - touchstartX;
    const diffY = touchendY - touchstartY;

    // VALIDASI: Hanya swipe kalau geseran horizontal jauh lebih besar dari vertikal
    // Ini biar pas lo scroll ke bawah, nggak sengaja pindah menu
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minDistance) {
        const activePage = document.querySelector('.page.active').id;
        const currentIndex = pagesOrder.indexOf(activePage);

        if (diffX < 0 && currentIndex < pagesOrder.length - 1) {
            // Swipe Kiri -> Next
            showPage(pagesOrder[currentIndex + 1]);
        } else if (diffX > 0 && currentIndex > 0) {
            // Swipe Kanan -> Prev
            showPage(pagesOrder[currentIndex - 1]);
        }
    }
}

// Event Listeners (Update dengan Y position)
document.getElementById('swipe-area').addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
}, {passive: true});

document.getElementById('swipe-area').addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    touchendY = e.changedTouches[0].screenY;
    handleGesture();
}, {passive: true});

// --- NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.navbar button').forEach(btn => btn.classList.remove('active-menu'));
    const btnId = 'nav-' + pageId;
    if(document.getElementById(btnId)) document.getElementById(btnId).classList.add('active-menu');

// TAMBAHKAN INI: Setiap pindah ke input-data, paksa tanggal ke hari ini
    if (pageId === 'input-data') {
        const dateInput = document.getElementById('inputDate');
        if (dateInput) dateInput.value = getTodayKey();
    }

    if (pageId === 'dashboard') updateUI();
    window.scrollTo(0,0);
}

// --- CORE FUNCTIONS ---
const getTodayKey = () => {
    const d = new Date();
    // Gunakan toLocaleDateString agar zona waktu sesuai dengan HP lo
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function updateUI() {
    const tglToday = getTodayKey(); // Ambil tanggal terbaru detik ini
    let totalIn = 0;
    let totalOut = 0;
    
    const tbody = document.getElementById('tableBody');
    if (tbody) tbody.innerHTML = '';

    logs.forEach(item => {
        // HANYA tampilkan jika tanggal di data SAMA dengan tanggal hari ini
        if (item.tanggal === tglToday) {
            if (item.tipe === 'in') {
                totalIn += item.kalori;
            } else {
                totalOut += item.kalori;
            }

            // Render ke tabel dashboard
            if (tbody) {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.nama}</td>
                        <td>${item.tipe === 'in' ? 'Masuk' : 'Keluar'}</td>
                        <td style="color:${item.tipe === 'in' ? '#d9534f' : '#28a745'}; font-weight:bold;">
                            ${item.tipe === 'in' ? '+' : '-'}${item.kalori}
                        </td>
                    </tr>`;
            }
        }
    });

    // Update Angka Donut & Summary
    const net = totalIn - totalOut;
    document.getElementById('dashIn').innerText = totalIn;
    document.getElementById('dashOut').innerText = totalOut;
    document.getElementById('dashNet').innerText = `${Math.abs(net)} kcal`;
    
    const statusEl = document.getElementById('dashStatus');
    statusEl.innerText = net > 0 ? "(Surplus)" : net < 0 ? "(Defisit)" : "(Seimbang)";
    statusEl.style.color = net > 0 ? "#d9534f" : net < 0 ? "#28a745" : "#007bff";

    updateChart(totalIn, totalOut);
}
function updateChart(vin, vout) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;
    const data = {
        datasets: [{
            data: [vin || 0.1, vout || 0.1],
            backgroundColor: (vin===0 && vout===0) ? ['#eee','#eee'] : ['#d9534f', '#28a745'],
            borderWidth: 0, cutout: '80%'
        }]
    };
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, { type: 'doughnut', data: data, options: { plugins: { legend: { display: false } } } });
}

function tambahItem() {
    const n = document.getElementById('foodName').value;
    const k = parseInt(document.getElementById('calories').value);
    const t = document.getElementById('type').value;
    const d = document.getElementById('inputDate').value || getTodayKey();
    if(!n || isNaN(k)) return alert("Isi data dengan benar!");
    logs.push({ tanggal: d, nama: n, tipe: t, kalori: k, ts: Date.now() });
    save(); updateUI();
    document.getElementById('foodName').value = ''; document.getElementById('calories').value = '';
}

function renderArchive() {
    const body = document.getElementById('archiveTableBody');
    if(!body) return;
    body.innerHTML = '';

    // 1. Sortir data (Terbaru di atas)
    let sorted = logs.map((it, i) => ({...it, originalIndex: i}))
                     .sort((a,b) => b.tanggal.localeCompare(a.tanggal) || b.ts - a.ts);

    // 2. Potong data sesuai halaman
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = sorted.slice(start, end);

    // 3. Render ke tabel
    paginatedItems.forEach(item => {
        // GUNAKAN FUNGSI FORMAT INDO DI SINI
        const tglTampil = formatTanggalIndo(item.tanggal); 

        // --- LOGIKA IKON BARU (TAMBAHKAN INI DI SINI) ---
        let iconType = '';
        if (item.tipe === 'in') {
            // Ikon Banah ke Bawah, Merah
            iconType = `<span class="material-icons tipe-icon icon-in">arrow_downward</span>`;
        } else {
            // Ikon Banah ke Atas, Hijau
            iconType = `<span class="material-icons tipe-icon icon-out">arrow_upward</span>`;
        }

        body.innerHTML += `
            <tr>
                <td><small>${tglTampil}</small></td>
                <td class="wrap-text">${item.nama}</td>
                <td style="text-align:center;">${iconType}</td>
                <td style="text-align:center">${item.kalori}</td>
                <td style="text-align:center">
                    <button class="btn-edit" onclick="bukaEdit(${item.originalIndex})">✎</button>
                    <button class="btn-hapus" onclick="hapusLog(${item.originalIndex})">✖</button>
                </td>
            </tr>`;
    });
    // 4. Panggil kontrol tombol halaman
    renderPagination(sorted.length);
}
function renderRekapHarian() {
    const body = document.getElementById('rekapTableBody');
    if(!body) return; body.innerHTML = '';
    const rekap = {};
    logs.forEach(it => { if(!rekap[it.tanggal]) rekap[it.tanggal]={in:0, out:0}; rekap[it.tanggal][it.tipe]+=it.kalori; });
    Object.keys(rekap).sort((a,b) => b.localeCompare(a)).forEach(tgl => {
        const d = rekap[tgl]; const net = d.in - d.out;
        const col = net < 0 ? '#28a745' : net > 0 ? '#d9534f' : '#007bff';
        body.innerHTML += `<tr><td><small>${formatTanggalIndo(tgl)}</small></td><td>${d.in}</td><td>${d.out}</td>
        <td style="color:${col}; font-weight:bold">${Math.abs(net)}</td><td style="color:${col}; font-size:0.8em">${net < 0 ? 'Defisit':'Surplus'}</td></tr>`;
    });
}

function hitungBMR() {
    const w = parseFloat(document.getElementById('bmr-weight').value), h = parseFloat(document.getElementById('bmr-height').value), a = parseInt(document.getElementById('bmr-age').value);
    const g = document.getElementById('gender').value, act = parseFloat(document.getElementById('activity').value), tgl = document.getElementById('bmrDate').value || getTodayKey();
    if(!w || !h || !a) return alert("Lengkapi data!");
    let bmrVal = Math.round((10 * w) + (6.25 * h) - (5 * a) + (g === 'male' ? 5 : -161));
    let tdee = Math.round(bmrVal * act);
    riwayatFisik.push({ tanggal: tgl, berat: w, bmr: bmrVal, tdee: tdee });
    profile = { ...profile, weight: w, height: h, age: a, bmr: bmrVal, tdee: tdee };
    save(); updateUI(); alert("Data fisik disimpan!");
}

function renderBmrHistory() {
    const body = document.getElementById('bmrTableBody');
    if(!body) return; body.innerHTML = '';
    [...riwayatFisik].sort((a,b) => b.tanggal.localeCompare(a.tanggal)).forEach((it, i) => {
        const realIdx = riwayatFisik.indexOf(it);
        body.innerHTML += `<tr><td><small>${formatTanggalIndo(it.tanggal)}</small></td><td>${it.berat} kg</td>
        <td style="color:#007bff; font-weight:bold">${it.bmr}</td><td style="color:#28a745; font-weight:bold">${it.tdee}</td>
        <td><button class="btn-edit" onclick="bukaEditBmr(${realIdx})">✎</button><button class="btn-hapus" onclick="hapusBmr(${realIdx})">✖</button></td></tr>`;
    });
}

function renderProfileView() {
    document.getElementById('profName').value = profile.name || '';
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    set('dispAge', profile.age ? profile.age + " Thn" : "-");
    set('dispWeight', profile.weight ? profile.weight + " kg" : "-");
    set('dispHeight', profile.height ? profile.height + " cm" : "-");
    set('dispBmr', profile.bmr ? profile.bmr + " kcal" : "-");
    set('dispTdee', profile.tdee ? profile.tdee + " kcal" : "-");
    if(profile.height) document.getElementById('idealWeight').innerText = ((profile.height - 100) * 0.9).toFixed(1);
}

// --- ACTIONS ---
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

function bukaEditBmr(i) {
    const it = riwayatFisik[i]; document.getElementById('editBmrIndex').value = i;
    document.getElementById('editBmrDate').value = it.tanggal; document.getElementById('editBmrWeight').value = it.berat;
    document.getElementById('editBmrTdee').value = it.tdee; document.getElementById('editBmrModal').classList.add('active');
}
function tutupBmrModal() { document.getElementById('editBmrModal').classList.remove('active'); }
function simpanEditBmr() {
    const i = document.getElementById('editBmrIndex').value;
    riwayatFisik[i].tanggal = document.getElementById('editBmrDate').value;
    riwayatFisik[i].berat = parseFloat(document.getElementById('editBmrWeight').value);
    riwayatFisik[i].tdee = parseInt(document.getElementById('editBmrTdee').value);
    if(i == riwayatFisik.length - 1) { profile.weight = riwayatFisik[i].berat; profile.tdee = riwayatFisik[i].tdee; }
    save(); updateUI(); tutupBmrModal();
}

function hapusLog(i) { if(confirm("Hapus aktivitas ini?")) { logs.splice(i,1); save(); updateUI(); } }
function hapusBmr(i) { if(confirm("Hapus data fisik ini?")) { riwayatFisik.splice(i,1); save(); updateUI(); } }
function saveProfile() { profile.name = document.getElementById('profName').value; save(); }
function save() { localStorage.setItem('logs', JSON.stringify(logs)); localStorage.setItem('riwayatFisik', JSON.stringify(riwayatFisik)); localStorage.setItem('profile', JSON.stringify(profile)); }

function exportData() {
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ logs, riwayatFisik, profile }));
    const a = document.createElement('a'); a.href = data; a.download = `calory_tracker_data.json`; a.click();
}
function importData(e) {
    const r = new FileReader(); r.onload = (ev) => {
        const d = JSON.parse(ev.target.result); logs = d.logs || []; riwayatFisik = d.riwayatFisik || []; profile = d.profile || profile;
        save(); updateUI(); alert("Backup Berhasil!");
    }; r.readAsText(e.target.files[0]);
}
function renderPagination(totalItems) {
    const ctrl = document.getElementById('paginationCtrl');
    if (!ctrl) return;
    
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    ctrl.innerHTML = '';

    if (totalPages <= 1) return; // Jangan munculin tombol kalau cuma 1 halaman

    // Tombol Previous
    if (currentPage > 1) {
        ctrl.innerHTML += `<button onclick="changePage(${currentPage - 1})">«</button>`;
    }

    // Nomor Halaman
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = (i === currentPage) ? 'class="active-page"' : '';
        ctrl.innerHTML += `<button ${activeClass} onclick="changePage(${i})">${i}</button>`;
    }

    // Tombol Next
    if (currentPage < totalPages) {
        ctrl.innerHTML += `<button onclick="changePage(${currentPage + 1})">»</button>`;
    }
}

function changePage(page) {
    currentPage = page;
    renderArchive(); // Render ulang tabel arsip aja
    window.scrollTo(0, document.getElementById('archiveTable').offsetTop - 100);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    showPage('dashboard');
    updateUI();
});
