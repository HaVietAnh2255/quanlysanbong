const phienUserAdmin = localStorage.getItem('user');
if (!phienUserAdmin) { alert("Vui lòng đăng nhập Admin!"); window.location.href = 'login.html'; }
const userAdmin = JSON.parse(phienUserAdmin);

const vungTk = document.getElementById('vung-tai-khoan-admin');
if (vungTk) {
    vungTk.innerHTML = `
        <span style="color: #ff9800; font-weight: bold; margin-right: 10px;">👋 Sếp: ${userAdmin.ten}</span>
        <a href="#" id="nut-dang-xuat-admin" style="color: #ff5722; text-decoration: none; font-size: 13px; font-weight: bold;">[Đăng xuất]</a>
    `;
    document.getElementById('nut-dang-xuat-admin').onclick = () => { localStorage.removeItem('user'); window.location.href = 'login.html'; };
}

let globalAllBookings = [];
let globalAllPitches = [];
let selectedSanId = 'ALL'; 
let currentKieuLoc = 'tuan'; 
let currentOffset = 0; // Dùng chung để chuyển Ngày/Tuần/Tháng/Năm
let myBarChart = null;
let myDoughnutChart = null;
const colorsPitch = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4'];

function loadDataAnalytics() {
    Promise.all([
        fetch('http://127.0.0.1:5000/api/pitch/admin/calendar?ngay=' + new Date().toISOString().split('T')[0]).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch('http://127.0.0.1:5000/api/booking/all-bookings').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([calendarRes, allBookingsRes]) => {
        globalAllPitches = (calendarRes && calendarRes.danh_sach_san) ? calendarRes.danh_sach_san : [];
        globalAllBookings = Array.isArray(allBookingsRes) ? allBookingsRes : [];

        // 🛠️ GIẢI QUYẾT LỖI KHỐNG 30 TRIỆU: Gộp và chia đều tiền hợp đồng cho các ca
        let tGroups = {};
        globalAllBookings.forEach(don => {
            if (don.ghi_chu && don.ghi_chu.includes('hop_dong')) {
                let key = don.ghi_chu + "_" + don.so_dien_thoai;
                if (!tGroups[key]) tGroups[key] = { count: 0, hop_dong: 0 };
                tGroups[key].count++;
                try { let info = JSON.parse(don.ghi_chu); if (info.hop_dong) tGroups[key].hop_dong = parseFloat(info.hop_dong); } catch(e){}
            }
        });

        globalAllBookings.forEach(don => {
            don.tien_thuc_te = parseFloat(don.tong_tien) || 0;
            don.is_giai_thuc_te = (don.loai_dat === 'Giai_Dau');
            if (don.ghi_chu && don.ghi_chu.includes('hop_dong')) {
                let key = don.ghi_chu + "_" + don.so_dien_thoai;
                if (tGroups[key] && tGroups[key].count > 0) {
                    don.tien_thuc_te = tGroups[key].hop_dong / tGroups[key].count; // Chia đều tiền (VD: 10M / 3 = 3.33M)
                    don.is_giai_thuc_te = true;
                }
            }
        });

        renderSanCards();
        tinhToanVabieuDo();
    }).catch(err => console.error("Lỗi tải báo cáo:", err));
}

function renderSanCards() {
    const box = document.getElementById('danh-sach-san-cards');
    if (!box) return;

    let html = `<div class="court-card ${selectedSanId === 'ALL' ? 'active' : ''}" onclick="chonSan('ALL')"><div class="court-name">🌟 Tất cả các sân</div><div class="court-stat">Báo cáo tổng hợp</div></div>`;

    globalAllPitches.forEach(san => {
        let dtSan = 0;
        globalAllBookings.forEach(don => {
            if (don.san_id == san.id) {
                // 🎯 Không cộng doanh thu của các ca hủy / đang yêu cầu hủy
                const laCaHuy = ['Da_Huy', 'Yeu_Cau_Huy', 'Sai_STK'].includes(don.trang_thai);
                if (!laCaHuy) {
                    dtSan += don.tien_thuc_te;
                } else {
                    // Cộng 50% tiền phạt cọc giữ lại vào doanh thu sân
                    dtSan += (don.tien_thuc_te * 0.5);
                }
            }
        });
        html += `<div class="court-card ${selectedSanId == san.id ? 'active' : ''}" onclick="chonSan(${san.id})"><div class="court-name">🏟️ ${san.ten_san}</div><div class="court-stat">Doanh thu: <b>${dtSan.toLocaleString()}đ</b></div></div>`;
    });
    box.innerHTML = html;
}

window.chonSan = function(sanId) { selectedSanId = sanId; renderSanCards(); tinhToanVabieuDo(); };

window.locTheoThoiGian = function(kieu) {
    currentKieuLoc = kieu;
    currentOffset = 0;
    if (event && event.target && event.target.tagName === 'BUTTON') {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    tinhToanVabieuDo();
};

window.chuyenThoiGian = function(dir) { currentOffset += dir; tinhToanVabieuDo(); };
window.veHienTai = function() { currentOffset = 0; tinhToanVabieuDo(); };

// FORMAT CHUỖI NGÀY
function formatISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function tinhToanVabieuDo() {
    let now = new Date();
    let startDate, endDate, displayTitle;
    let chartLabels = [];
    let getColIndex = null; 

    if (currentKieuLoc === 'ngay') {
        let target = new Date(now); target.setDate(now.getDate() + currentOffset);
        startDate = new Date(target); endDate = new Date(target);
        displayTitle = `Ngày ${String(target.getDate()).padStart(2,'0')}/${String(target.getMonth()+1).padStart(2,'0')}/${target.getFullYear()}`;
        chartLabels = ['6h-8h', '8h-10h', '10h-12h', '12h-14h', '14h-16h', '16h-18h', '18h-20h', '20h-22h', '22h-24h'];
        getColIndex = (don) => {
            if(!don.gio_bat_dau) return -1;
            let h = parseInt(don.gio_bat_dau.split(':')[0]);
            if (h < 6) return 0;
            let idx = Math.floor((h - 6) / 2); return idx > 8 ? 8 : idx;
        };
    } 
    else if (currentKieuLoc === 'tuan') {
        let target = new Date(now);
        let diff = (target.getDay() === 0 ? -6 : 1 - target.getDay()) + (currentOffset * 7);
        target.setDate(now.getDate() + diff);
        startDate = new Date(target);
        endDate = new Date(target); endDate.setDate(startDate.getDate() + 6);
        displayTitle = `${String(startDate.getDate()).padStart(2,'0')}/${String(startDate.getMonth()+1).padStart(2,'0')} - ${String(endDate.getDate()).padStart(2,'0')}/${String(endDate.getMonth()+1).padStart(2,'0')}/${endDate.getFullYear()}`;
        chartLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((t, i) => {
            let temp = new Date(startDate); temp.setDate(startDate.getDate() + i);
            return `${t} (${String(temp.getDate()).padStart(2,'0')}/${String(temp.getMonth()+1).padStart(2,'0')})`;
        });
        getColIndex = (don) => {
            let dStr = don.ngay_da;
            for(let i=0; i<7; i++) {
                let temp = new Date(startDate); temp.setDate(startDate.getDate() + i);
                if (formatISO(temp) === dStr) return i;
            }
            return -1;
        };
    } 
    else if (currentKieuLoc === 'thang') {
        let y = now.getFullYear(); let m = now.getMonth() + currentOffset;
        startDate = new Date(y, m, 1); endDate = new Date(y, m + 1, 0);
        displayTitle = `Tháng ${String(startDate.getMonth()+1).padStart(2,'0')}/${startDate.getFullYear()}`;
        chartLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];
        getColIndex = (don) => {
            let day = parseInt(don.ngay_da.split('-')[2]);
            let idx = Math.floor((day - 1) / 7); return idx > 4 ? 4 : idx;
        };
    } 
    else if (currentKieuLoc === 'nam') {
        let y = now.getFullYear() + currentOffset;
        startDate = new Date(y, 0, 1); endDate = new Date(y, 11, 31);
        displayTitle = `Năm ${y}`;
        chartLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        getColIndex = (don) => parseInt(don.ngay_da.split('-')[1]) - 1;
    }

    document.getElementById('hien-thi-khoang-thoi-gian').innerText = displayTitle;
    let startStr = formatISO(startDate);
    let endStr = formatISO(endDate);

    let listDonFiltered = globalAllBookings.filter(don => don.ngay_da >= startStr && don.ngay_da <= endStr);
    
    if (selectedSanId !== 'ALL') {
        listDonFiltered = listDonFiltered.filter(b => b.san_id == selectedSanId);
        let sanObj = globalAllPitches.find(s => s.id == selectedSanId);
        document.getElementById('ten-san-baocao').innerText = `Báo cáo nhanh: ${sanObj ? sanObj.ten_san : 'Sân chọn'}`;
    } else {
        document.getElementById('ten-san-baocao').innerText = 'Báo cáo nhanh: Tất cả các sân';
    }

    let tongThu = 0, thuCaLe = 0, thuGiaiDau = 0, soCaHuy = 0, tienCocHuy = 0, tongSoCaDat = 0;
    let gioFrequency = {};

    listDonFiltered.forEach(don => {
        let tien = don.tien_thuc_te; 
        let isGiai = don.is_giai_thuc_te;

        // 🎯 KIỂM TRA ĐỦ CẢ 3 TRẠNG THÁI HỦY
        const laCaHuy = ['Da_Huy', 'Yeu_Cau_Huy', 'Sai_STK'].includes(don.trang_thai);

        if (!laCaHuy) {
            tongThu += tien; 
            tongSoCaDat++;
            if (isGiai) thuGiaiDau += tien; else thuCaLe += tien;
            if (don.gio_bat_dau) {
                let kh = `${don.gio_bat_dau} - ${don.gio_ket_thuc || ''}`;
                gioFrequency[kh] = (gioFrequency[kh] || 0) + 1;
            }
        } else {
            // 🎯 TĂNG ĐẾM CA HỦY CHÍNH XÁC
            soCaHuy++;
            // Quy định: Hủy trước 24h phạt 50% cọc -> Chủ sân thu 50% giá trị ca
            let cocGiuLai = tien * 0.5; 
            tienCocHuy += cocGiuLai; 
            tongThu += cocGiuLai;
            if (isGiai) thuGiaiDau += cocGiuLai; else thuCaLe += cocGiuLai;
        }
    });

    document.getElementById('kpi-tong-doanh-thu').innerText = tongThu.toLocaleString() + ' VNĐ';
    document.getElementById('kpi-ca-le').innerText = thuCaLe.toLocaleString() + ' VNĐ';
    document.getElementById('kpi-giai-dau').innerText = thuGiaiDau.toLocaleString() + ' VNĐ';
    document.getElementById('kpi-so-ca-huy').innerText = soCaHuy + ' ca';
    document.getElementById('kpi-tien-coc-giu').innerText = `Thu cọc giữ lại: ${tienCocHuy.toLocaleString()} VNĐ`;

    let ptLe = tongThu > 0 ? Math.round((thuCaLe / tongThu) * 100) : 0;
    let ptGiai = tongThu > 0 ? Math.round((thuGiaiDau / tongThu) * 100) : 0;
    document.getElementById('kpi-ca-le-pt').innerText = `${ptLe}% tổng thu`;
    document.getElementById('kpi-giai-dau-pt').innerText = `${ptGiai}% tổng thu`;

    document.getElementById('bc-tong-ca-dat').innerText = tongSoCaDat + ' ca';
    let avgHour = tongSoCaDat > 0 ? Math.round(tongThu / (tongSoCaDat * 1.5)) : 0;
    document.getElementById('bc-doanh-thu-gio').innerText = avgHour.toLocaleString() + ' VNĐ';

    let diffDays = Math.round((endDate - startDate) / (1000 * 3600 * 24)) + 1;
    let numSoSan = (selectedSanId === 'ALL') ? (globalAllPitches.length || 1) : 1;
    let tongCaKhaDung = numSoSan * 8 * diffDays;
    let tyLeLapDay = Math.min(100, Math.round((tongSoCaDat / tongCaKhaDung) * 100));
    document.getElementById('bc-ty-le-lap-day').innerText = `${tyLeLapDay}%`;

    let gioMax = "Chưa có dữ liệu", maxCount = 0;
    for (let g in gioFrequency) { if (gioFrequency[g] > maxCount) { maxCount = gioFrequency[g]; gioMax = g; } }
    document.getElementById('bc-gio-cao-diem').innerText = gioMax;

    veBiieuDoStackedBarDaNang(listDonFiltered, chartLabels, getColIndex);
    veBiieuDoDoughnutTheoSan(listDonFiltered, tongThu);
}

function veBiieuDoStackedBarDaNang(listDon, labelsDung, getColIndex) {
    const ctx = document.getElementById('chartDoanhThuBar').getContext('2d');
    if (myBarChart) myBarChart.destroy();

    let datasetsSan = globalAllPitches.map((san, idx) => ({
        label: san.ten_san,
        data: Array(labelsDung.length).fill(0),
        tournamentFlags: Array(labelsDung.length).fill(false), // 👈 Cờ theo dõi Giải đấu
        backgroundColor: colorsPitch[idx % colorsPitch.length],
        borderRadius: 4
    }));

    listDon.forEach(don => {
        // 🎯 BỎ QUA CẢ CA ĐÃ HỦY LẪN ĐANG YÊU CẦU HỦY KHI VẼ CỘT GIỜ ĐÁ
        if (['Da_Huy', 'Yeu_Cau_Huy', 'Sai_STK'].includes(don.trang_thai) || !don.ngay_da) return;
        
        let colIdx = getColIndex(don);
        if (colIdx === -1) return;

        let tien = don.tien_thuc_te; 
        let isGiai = don.is_giai_thuc_te;

        let dsMatch = datasetsSan.find(ds => ds.label.includes(don.ten_san) || globalAllPitches.find(s => s.id == don.san_id)?.ten_san === ds.label);
        if (dsMatch) {
            dsMatch.data[colIdx] += tien;
            if (isGiai) dsMatch.tournamentFlags[colIdx] = true; 
        } else if (datasetsSan.length > 0) {
            datasetsSan[0].data[colIdx] += tien;
            if (isGiai) datasetsSan[0].tournamentFlags[colIdx] = true;
        }
    }); 

    // 🎨 PLUGIN ĐẶC BIỆT: VẼ QUẢ BÓNG ⚽ VÀO GIỮA CỘT NẾU LÀ GIẢI ĐẤU
    const drawBallPlugin = {
        id: 'drawBall',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                    if (dataset.tournamentFlags && dataset.tournamentFlags[index]) {
                        ctx.font = '14px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        // Đặt bóng chính giữa phần cột màu của sân đó
                        ctx.fillText('⚽', bar.x, bar.y + (bar.base - bar.y) / 2);
                    }
                });
            });
        }
    };

    myBarChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labelsDung, datasets: datasetsSan },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: v => v.toLocaleString() + 'đ' } } },
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} VNĐ` } } }
        },
        plugins: [drawBallPlugin] // Đăng ký Plugin vào đây
    });
}

function veBiieuDoDoughnutTheoSan(listDon, tongThu) {
    const ctx = document.getElementById('chartCoCauDoughnut').getContext('2d');
    if (myDoughnutChart) myDoughnutChart.destroy();

    // TRƯỜNG HỢP 1: Khoảng thời gian này chưa có doanh thu -> Vẽ vòng tròn màu xám/trắng
    if (!tongThu || tongThu <= 0 || !globalAllPitches || globalAllPitches.length === 0) {
        myDoughnutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Chưa có doanh thu'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: () => ' Không có doanh thu trong khoảng thời gian này'
                        }
                    }
                }
            }
        });
        return;
    }

    // TRƯỜNG HỢP 2: Có doanh thu -> Tính doanh thu lẻ & giải của từng sân
    let labels = [];
    let dataValues = [];
    let bgColors = [];
    let chiTietTungSan = [];

    globalAllPitches.forEach((san, idx) => {
        let dtLe = 0;
        let dtGiai = 0;

        listDon.forEach(don => {
            if (don.san_id == san.id) {
                const laCaHuy = ['Da_Huy', 'Yeu_Cau_Huy', 'Sai_STK'].includes(don.trang_thai);
                let tienThuc = laCaHuy ? (don.tien_thuc_te * 0.5) : don.tien_thuc_te;

                if (don.is_giai_thuc_te) {
                    dtGiai += tienThuc;
                } else {
                    dtLe += tienThuc;
                }
            }
        });

        let tongSan = dtLe + dtGiai;
        labels.push(san.ten_san);
        dataValues.push(tongSan);
        bgColors.push(colorsPitch[idx % colorsPitch.length]);
        chiTietTungSan.push({ dtLe, dtGiai, tongSan });
    });

    myDoughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let idx = context.dataIndex;
                            let info = chiTietTungSan[idx];
                            let pt = tongThu > 0 ? ((info.tongSan / tongThu) * 100).toFixed(1) : 0;
                            return [
                                ` 🏟️ ${context.label}: ${info.tongSan.toLocaleString()} VNĐ (${pt}%)`,
                                `   • ⚽ Đá lẻ: ${info.dtLe.toLocaleString()} VNĐ`,
                                `   • 🏆 Giải đấu: ${info.dtGiai.toLocaleString()} VNĐ`
                            ];
                        }
                    }
                }
            }
        }
    });
}

loadDataAnalytics();