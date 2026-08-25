const timeSlots = [];
for (let h = 0; h < 24; h++) { let hr = h < 10 ? '0'+h : h; timeSlots.push(`${hr}:00`); timeSlots.push(`${hr}:30`); }

const dateInput = document.getElementById('ngay_da');
const today = new Date();
const nextWeek = new Date();
nextWeek.setDate(today.getDate() + 7);
const formatDate = (date) => { let d = date.getDate(), m = date.getMonth()+1, y = date.getFullYear(); return `${y}-${m<10?'0'+m:m}-${d<10?'0'+d:d}`; };

dateInput.min = formatDate(today);
dateInput.max = formatDate(nextWeek);

const phienDangNhap = localStorage.getItem('user');
if (!phienDangNhap) { alert("Bạn cần đăng nhập để đặt sân!"); window.location.href = 'login.html'; }
const userHienTai = JSON.parse(phienDangNhap);

let nutAdmin = (userHienTai.vai_tro === 'Admin' || userHienTai.vai_tro === 'admin') 
    ? `<a href="admin_dashboard.html" style="background: #ff9800; color: black; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-right: 15px;">⚙️ Vào Quản Trị</a>` : '';

document.getElementById('vung-tai-khoan').innerHTML = `
    ${nutAdmin}
    <span style="margin-right: 15px; font-weight: bold; color: #17b978;">👋 Chào, ${userHienTai.ten}</span>
    <a href="#" id="nut-dang-xuat" style="color: #ff5722; text-decoration: none; font-size: 14px; font-weight: bold;">[Đăng xuất]</a>
`;
document.getElementById('nut-dang-xuat').onclick = (e) => { e.preventDefault(); localStorage.removeItem('user'); localStorage.removeItem('token'); window.location.href = 'index.html'; };
document.getElementById('loai_dat').onchange = function() { if (this.value === 'Giai_Dau') window.location.href = 'booking_tournament.html'; };

window.danhSachSanBong = [];
window.duLieuCaDat = [];

document.addEventListener("DOMContentLoaded", function() {
    fetch('http://127.0.0.1:5000/api/pitch/get-pitches')
        .then(res => res.json())
        .then(data => {
            window.danhSachSanBong = data;
            const selectSan = document.getElementById('san_id');
            data.forEach(san => selectSan.insertAdjacentHTML('beforeend', `<option value="${san.id}">${san.ten_san}</option>`));
        });
});

document.getElementById('san_id').onchange = taiLichTrong;
document.getElementById('ngay_da').onchange = taiLichTrong;

let selectedSlots = [];
function taiLichTrong() {
    const san_id = document.getElementById('san_id').value;
    const ngay_da = document.getElementById('ngay_da').value;
    const grid = document.getElementById('time-grid');
    selectedSlots = []; capNhatThongTinDon();

    if (!san_id || !ngay_da) { grid.innerHTML = '<p class="placeholder-text">Vui lòng chọn Sân và Ngày...</p>'; return; }
    const sanCheck = window.danhSachSanBong.find(s => s.id == san_id);
    if (sanCheck && (sanCheck.trang_thai === 'Bao_Tri' || sanCheck.trang_thai_hoat_dong === false)) {
        grid.innerHTML = '<div style="grid-column: span 10; background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px;">⚠️ Sân đang bảo trì!</div>'; return; 
    }

    grid.innerHTML = '<p>Đang tải dữ liệu...</p>';
    fetch(`http://127.0.0.1:5000/api/booking/get-slots?san_id=${san_id}&ngay_da=${ngay_da}`)
        .then(res => res.json())
        .then(bookedData => {
            grid.innerHTML = '';
            if (bookedData.length === 1 && bookedData[0].loai === 'Giai_Dau') {
                timeSlots.forEach(slot => grid.insertAdjacentHTML('beforeend', `<div class="slot booked">${slot}</div>`));
                return; 
            }

            let bookedRed = new Set();
            let bookedYellow = new Set();
            bookedData.forEach(lich => {
                let startIdx = timeSlots.indexOf(lich.bat_dau);
                let endIdx = timeSlots.indexOf(lich.ket_thuc);
                for (let i = startIdx; i < endIdx; i++) {
                    if (i !== -1) {
                        if(lich.trang_thai === 'Chua_Coc') bookedYellow.add(timeSlots[i]);
                        else bookedRed.add(timeSlots[i]);
                    }
                }
            });

            const hienTai = new Date();
            const laHomNay = (ngay_da === formatDate(hienTai));
            const gioHienTaiStr = `${hienTai.getHours() < 10 ? '0'+hienTai.getHours() : hienTai.getHours()}:${hienTai.getMinutes() < 10 ? '0'+hienTai.getMinutes() : hienTai.getMinutes()}`;

            timeSlots.forEach(slot => {
                let div = document.createElement('div');
                let isRed = bookedRed.has(slot);
                let isYellow = bookedYellow.has(slot) && !isRed;
                let isPast = laHomNay && (slot < gioHienTaiStr);

                div.innerText = slot; div.dataset.time = slot;
                if (isPast) {
                    div.className = 'slot booked'; div.title = "Đã qua giờ đá";
                } else if (isRed) {
                    div.className = 'slot booked';
                } else if (isYellow) {
                    div.className = 'slot yellow'; div.title = "Có người giữ nhưng chưa trả tiền. Bạn có thể cướp!";
                    div.onclick = () => xuLyChonGio(div);
                } else {
                    div.className = 'slot available'; div.onclick = () => xuLyChonGio(div);
                }
                grid.appendChild(div);
            });
        });
}

function xuLyChonGio(el) {
    let time = el.dataset.time;
    if (el.classList.contains('selected')) {
        el.classList.remove('selected');
        selectedSlots = selectedSlots.filter(t => t !== time);
    } else {
        el.classList.add('selected');
        selectedSlots.push(time);
    }
    capNhatThongTinDon();
}

function capNhatThongTinDon() {
    const btnXacNhan = document.getElementById('btn-xac-nhan');
    const sanIdSelected = document.getElementById('san_id').value;
    window.duLieuCaDat = []; 
    let tongTienToanBo = 0;
    let chuoiHienThiCa = "";

    if (selectedSlots.length > 0) {
        selectedSlots.sort();
        
        let tempBlocks = [];
        let blockStart = selectedSlots[0];
        let blockLast = selectedSlots[0];

        for (let i = 1; i < selectedSlots.length; i++) {
            if (timeSlots.indexOf(selectedSlots[i]) === timeSlots.indexOf(blockLast) + 1) {
                blockLast = selectedSlots[i];
            } else {
                tempBlocks.push({ start: blockStart, last: blockLast });
                blockStart = selectedSlots[i]; blockLast = selectedSlots[i];
            }
        }
        tempBlocks.push({ start: blockStart, last: blockLast });

        const sanHienTai = window.danhSachSanBong.find(s => s.id == sanIdSelected);
        tempBlocks.forEach((blk) => {
            let endIdx = timeSlots.indexOf(blk.last) + 1;
            let ket_thuc = endIdx < timeSlots.length ? timeSlots[endIdx] : '23:59';
            
            let tienBlock = 0;
            for (let i = timeSlots.indexOf(blk.start); i <= timeSlots.indexOf(blk.last); i++) {
                let slotGio = timeSlots[i];
                let giaSlot = sanHienTai?.gia_tien_mac_dinh || 0;
                if (sanHienTai && sanHienTai.khung_gia) {
                    let filterGia = sanHienTai.khung_gia.find(kg => slotGio >= kg.tu && slotGio < kg.den);
                    if(filterGia) giaSlot = filterGia.gia;
                }
                tienBlock += giaSlot;
            }
            
            tongTienToanBo += tienBlock;
            window.duLieuCaDat.push({ bat_dau: blk.start, ket_thuc: ket_thuc, tien: tienBlock });
            chuoiHienThiCa += `[${blk.start} - ${ket_thuc}] `;
        });
        
        document.getElementById('ca_da_chon_hien_thi').innerText = chuoiHienThiCa;
        document.getElementById('tong_tien_hien_thi').innerText = tongTienToanBo.toLocaleString() + " VNĐ";
        
        btnXacNhan.disabled = false; btnXacNhan.style.background = '#17b978'; btnXacNhan.style.cursor = 'pointer'; btnXacNhan.innerText = 'Xác Nhận Đặt Sân';
    } else {
        document.getElementById('ca_da_chon_hien_thi').innerText = 'Chưa chọn';
        document.getElementById('tong_tien_hien_thi').innerText = '0 VNĐ';
        btnXacNhan.disabled = true; btnXacNhan.style.background = '#ccc'; btnXacNhan.style.cursor = 'not-allowed'; btnXacNhan.innerText = 'Vui lòng chọn giờ đá';
    }
}

document.getElementById('form-dat-lich').addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
        user_id: userHienTai.id, 
        san_id: parseInt(document.getElementById('san_id').value),
        ngay_da: document.getElementById('ngay_da').value,
        loai_dat: document.getElementById('loai_dat').value,
        danh_sach_ca: window.duLieuCaDat
    };

    fetch('http://127.0.0.1:5000/api/booking/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json().then(result => ({ status: res.status, body: result })))
    .then(resObj => {
        if (resObj.status === 201) {
            const qrUrl = `https://img.vietqr.io/image/mbbank-0961645144-compact2.png?amount=${resObj.body.tong_tien}&addInfo=DATSAN ${resObj.body.don_id}&accountName=HA VIET ANH`;
            document.getElementById('qr-img').src = qrUrl;
            document.getElementById('qr-tien').innerText = resObj.body.tong_tien.toLocaleString() + " VNĐ";
            document.getElementById('qr-modal').style.display = 'flex';
            
            document.getElementById('btn-bao-coc').onclick = function() {
                this.innerText = 'Đang gửi thông báo...'; this.style.background = '#ccc'; this.disabled = true;
                fetch('http://127.0.0.1:5000/api/booking/update-status', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ don_id: resObj.body.don_id, trang_thai: 'Dang_Xet' })
                }).then(() => {
                    alert("🎉 Đã gửi thông báo cho Chủ sân. Bạn đã chiếm được slot này!");
                    window.location.reload(); 
                });
            };
            document.getElementById('btn-dong-qr').onclick = () => window.location.reload();
        } else {
            alert("Lỗi: " + resObj.body.message);
            taiLichTrong();
        }
    });
});