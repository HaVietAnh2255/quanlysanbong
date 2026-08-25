// =========================================================
// HỆ THỐNG ĐĂNG KÝ GIẢI ĐẤU & CHECK TRÙNG LỊCH BÁO ĐỎ REAL-TIME
// =========================================================

const phienDangNhap = localStorage.getItem('user');
if (!phienDangNhap) { alert("Bạn cần đăng nhập để đăng ký giải đấu!"); window.location.href = 'login.html'; }
const userHienTai = JSON.parse(phienDangNhap);

let nutAdmin = (userHienTai.vai_tro === 'Admin' || userHienTai.vai_tro === 'admin') 
    ? `<a href="admin_dashboard.html" style="background: #ff9800; color: black; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-right: 15px;">⚙️ Vào Quản Trị</a>` : '';

const vungTk = document.getElementById('vung-tai-khoan');
if (vungTk) {
    vungTk.innerHTML = `
        ${nutAdmin}
        <span style="margin-right: 15px; font-weight: bold; color: #17b978;">👋 Chào, ${userHienTai.ten}</span>
        <a href="#" id="nut-dang-xuat" style="color: #ff5722; text-decoration: none; font-size: 14px; font-weight: bold;">[Đăng xuất]</a>
    `;
    document.getElementById('nut-dang-xuat').onclick = (e) => { e.preventDefault(); localStorage.removeItem('user'); localStorage.removeItem('token'); window.location.href = 'index.html'; };
}

const today = new Date();
const minMinDate = new Date(today);
minMinDate.setDate(today.getDate() + 7); 
const formatDate = (d) => {
    let month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};
const minDateStr = formatDate(minMinDate);

// Set ngày nhỏ nhất cho hàng đầu tiên
const inputNgayDauTien = document.querySelector('.ngay-giai');
if (inputNgayDauTien) { inputNgayDauTien.min = minDateStr; }

// Ánh xạ Buổi đá -> Khung giờ chuẩn (HH:MM)
function quyDoiKhungGio(buoiVal) {
    if (buoiVal.includes('Sáng')) return { gio_bd: '05:00', gio_kt: '11:00' };
    if (buoiVal.includes('Chiều')) return { gio_bd: '14:00', gio_kt: '17:00' };
    if (buoiVal.includes('Tối')) return { gio_bd: '17:00', gio_kt: '23:00' };
    return { gio_bd: '05:00', gio_kt: '23:00' }; // Cả ngày
}

// 📌 HÀM GỌI API CHECK TRÙNG LỊCH VÀ BÁO ĐỎ TỪNG DÒNG
function checkRowOverlap(rowElem) {
    const selectSan = document.getElementById('san_id');
    const sanId = selectSan ? selectSan.value : null;
    const inputNgay = rowElem.querySelector('.ngay-giai');
    const selectBuoi = rowElem.querySelector('.buoi-giai');
    
    // Tìm thẻ hiển thị thông báo lỗi bên dưới dòng
    let msgElem = rowElem.querySelector('.msg-loi-trung');
    if (!msgElem) {
        msgElem = document.createElement('div');
        msgElem.className = 'msg-loi-trung';
        msgElem.style.cssText = 'color: #dc2626; font-weight: bold; font-size: 12px; margin-top: 5px; width: 100%;';
        rowElem.appendChild(msgElem);
    }

    if (!sanId || !inputNgay.value) {
        rowElem.style.borderColor = '#e0e0e0';
        rowElem.style.background = '#f8f9fa';
        msgElem.innerText = '';
        rowElem.dataset.isOverlap = "false";
        checkBtnSubmitState();
        return;
    }

    const kg = quyDoiKhungGio(selectBuoi.value);

    // Gọi API Check Overlap Thời Gian Thực
    fetch('http://127.0.0.1:5000/api/booking/check-overlap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            san_id: parseInt(sanId),
            ngay_da: inputNgay.value,
            gio_bat_dau: kg.gio_bd,
            gio_ket_thuc: kg.gio_kt
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.is_trung) {
            // ❌ BÁO ĐỎ CẢNH BÁO
            rowElem.style.borderColor = '#dc2626';
            rowElem.style.background = '#fef2f2';
            msgElem.innerText = data.message;
            rowElem.dataset.isOverlap = "true";
        } else {
            // ✅ HỢP LỆ
            rowElem.style.borderColor = '#16a34a';
            rowElem.style.background = '#f0fdf4';
            msgElem.innerText = '✅ Khung giờ khả dụng!';
            msgElem.style.color = '#16a34a';
            rowElem.dataset.isOverlap = "false";
        }
        checkBtnSubmitState();
    })
    .catch(() => {
        rowElem.dataset.isOverlap = "false";
        checkBtnSubmitState();
    });
}

// KHÓA / MỞ NÚT SUBMIT NẾU CÓ DÒNG BỊ BÁO ĐỎ
function checkBtnSubmitState() {
    const btnSubmit = document.querySelector('.btn-submit');
    const hasOverlap = Array.from(document.querySelectorAll('.ngay-da-row')).some(r => r.dataset.isOverlap === "true");
    if (btnSubmit) {
        btnSubmit.disabled = hasOverlap;
        btnSubmit.style.opacity = hasOverlap ? '0.5' : '1';
        btnSubmit.style.cursor = hasOverlap ? 'not-allowed' : 'pointer';
    }
}

// BẮT SỰ KIỆN GÁN CHO TỪNG DÒNG
function bindRowEvents(rowElem) {
    const inputNgay = rowElem.querySelector('.ngay-giai');
    const selectBuoi = rowElem.querySelector('.buoi-giai');
    
    if (inputNgay) inputNgay.addEventListener('change', () => checkRowOverlap(rowElem));
    if (selectBuoi) selectBuoi.addEventListener('change', () => checkRowOverlap(rowElem));
}

// Gán sự kiện cho hàng chọn ngày đầu tiên
const rowDauTien = document.querySelector('.ngay-da-row');
if (rowDauTien) {
    rowDauTien.style.flexWrap = 'wrap';
    bindRowEvents(rowDauTien);
}

// Lắng nghe khi người dùng đổi Sân Bóng ở dropdown chính
const selectSanMain = document.getElementById('san_id');
if (selectSanMain) {
    selectSanMain.addEventListener('change', function() {
        document.querySelectorAll('.ngay-da-row').forEach(row => checkRowOverlap(row));
    });
}

// NÚT THÊM NGÀY THI ĐẤU
const btnThemNgay = document.getElementById('btn-them-ngay');
if (btnThemNgay) {
    btnThemNgay.onclick = function() {
        const row = document.createElement('div');
        row.className = 'ngay-da-row';
        row.style.flexWrap = 'wrap';
        row.innerHTML = `
            <input type="date" class="ngay-giai" min="${minDateStr}" required style="flex:1;">
            <select class="buoi-giai" required style="flex:1;">
                <option value="Sáng (05:00 - 11:00)">Sáng (05:00 - 11:00)</option>
                <option value="Chiều (14:00 - 17:00)">Chiều (14:00 - 17:00)</option>
                <option value="Tối (17:00 - 23:00)">Tối (17:00 - 23:00)</option>
                <option value="Cả ngày (05:00 - 23:00)">Cả ngày (05:00 - 23:00)</option>
            </select>
            <button type="button" class="btn-xoa-ngay" style="background:#ff5722; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">❌</button>
        `;
        row.querySelector('.btn-xoa-ngay').onclick = function() {
            row.remove();
            checkBtnSubmitState();
        };
        
        document.getElementById('danh-sach-ngay-da').appendChild(row);
        bindRowEvents(row);
    };
}

// TẢI DANH SÁCH SÂN BÓNG
document.addEventListener("DOMContentLoaded", function() {
    fetch('http://127.0.0.1:5000/api/pitch/get-pitches')
        .then(res => res.json())
        .then(data => {
            const selectSan = document.getElementById('san_id');
            if (selectSan) {
                data.forEach(san => selectSan.insertAdjacentHTML('beforeend', `<option value="${san.id}">${san.ten_san}</option>`));
            }
        });
});

// XỬ LÝ SUBMIT FORM ĐĂNG KÝ GIẢI
const formDangKy = document.getElementById('form-dang-ky-giai');
if (formDangKy) {
    formDangKy.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const dongNgay = document.querySelectorAll('.ngay-da-row');
        let dates = [];
        let listLichDuKien = [];
        let yeuCauLichText = "";
        const sanIdVal = parseInt(document.getElementById('san_id').value);
        
        dongNgay.forEach(row => {
            let d = row.querySelector('.ngay-giai').value;
            let b = row.querySelector('.buoi-giai').value;
            if (d) { 
                dates.push(d); 
                let kg = quyDoiKhungGio(b);
                listLichDuKien.push({
                    san_id: sanIdVal,
                    ngay_da: d,
                    gio_bat_dau: kg.gio_bd,
                    gio_ket_thuc: kg.gio_kt,
                    ten_buoi: b
                });
                yeuCauLichText += `- Ngày: ${d} | Đăng ký: ${b}\n`; 
            }
        });

        if (dates.length === 0) { alert("Vui lòng chọn ít nhất 1 ngày thi đấu!"); return; }
        dates.sort();

        const data = {
            user_id: userHienTai.id,
            san_id: sanIdVal,
            ten_giai: document.getElementById('ten_giai').value,
            don_vi_to_chuc: document.getElementById('don_vi_to_chuc').value,
            so_doi: parseInt(document.getElementById('so_doi').value),
            ngay_khai_mac: dates[0],
            ngay_be_mac: dates[dates.length - 1],
            yeu_cau_them: document.getElementById('yeu_cau_them').value,
            lich_du_kien: JSON.stringify(listLichDuKien) // Gửi mảng Object cấu trúc chuẩn sang Backend
        };

        fetch('http://127.0.0.1:5000/api/booking/book-tournament', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data)
        })
        .then(res => res.json().then(result => ({status: res.status, body: result})))
        .then(resData => {
            if (resData.status !== 201) {
                alert("❌ KHÔNG THỂ TẠO GIẢI ĐẤU:\n" + resData.body.detail);
            } else {
                alert("🎉 " + resData.body.message);
                window.location.href = 'booking_history.html';
            }
        })
        .catch(err => alert("Có lỗi xảy ra khi kết nối hệ thống!"));
    });
}