// 1. KIỂM TRA QUYỀN ADMIN & ĐĂNG XUẤT
const phienUserAdmin = localStorage.getItem('user');
if (!phienUserAdmin) { alert("Vui lòng đăng nhập Admin!"); window.location.href = 'login.html'; }
const userAdmin = JSON.parse(phienUserAdmin);

const vungTaiKhoanAdmin = document.getElementById('vung-tai-khoan-admin');
if (vungTaiKhoanAdmin) {
    vungTaiKhoanAdmin.innerHTML = `
        <span style="color: #ff9800; font-weight: bold; margin-right: 10px;">👋 Sếp: ${userAdmin.ten}</span>
        <a href="#" id="nut-dang-xuat-admin" style="color: #ff5722; text-decoration: none; font-size: 13px; font-weight: bold;">[Đăng xuất]</a>
    `;
    document.getElementById('nut-dang-xuat-admin').onclick = (e) => {
        e.preventDefault(); localStorage.removeItem('user'); window.location.href = 'login.html';
    };
}

// 2. TAO MỐC GIỜ 30 PHÚT (Từ 05:00 đến 23:00)
function taoDanhSachMocGio() {
    let list = [];
    for (let h = 0; h < 24; h++) {
        let hStr = h < 10 ? '0' + h : '' + h;
        list.push(`${hStr}:00`);
        list.push(`${hStr}:30`);
    }
    return list;
}
const DANH_SACH_MOC_GIO = taoDanhSachMocGio(); // 48 mốc 30p

let globalMapDonDat = {}; // Map lưu cache đơn đặt

const inputNgay = document.getElementById('select-ngay-xem');
const todayStr = new Date().toISOString().split('T')[0];
inputNgay.value = todayStr;

// 3. TẢI MA TRẬN LỊCH TỪ BACKEND
function taiMaTranhLich(ngayStr) {
    fetch(`http://127.0.0.1:5000/api/pitch/admin/calendar?ngay=${ngayStr}`)
        .then(res => res.json())
        .then(result => {
            if (result.status === 'success') {
                renderMaTranhLich(result.danh_sach_san, result.danh_sach_dat);
            }
        })
        .catch(err => console.error("Lỗi lấy lịch:", err));
}

// 4. RENDER BẢNG MA TRẬN KHÔNG CHỮ + GỘP Ô COLSPAN
function renderMaTranhLich(danhSachSan, danhSachDat) {
    globalMapDonDat = {};
    
    // Render Header (Các mốc giờ 30p)
    const headerRow = document.getElementById('table-header-gio');
    headerRow.innerHTML = '<th class="san-col">🏟️ Sân Bóng</th>';
    DANH_SACH_MOC_GIO.forEach(gio => {
        headerRow.innerHTML += `<th>${gio}</th>`;
    });

    const bodyBox = document.getElementById('table-body-lich');
    bodyBox.innerHTML = '';

    // Render từng hàng Sân Bóng
    danhSachSan.forEach(san => {
        let trHTML = `<tr><td class="san-col">${san.ten_san}</td>`;
        
        // Lấy danh sách đơn cọc/giải của sân này
        let donCuaSan = danhSachDat.filter(d => d.san_id === san.id && (d.trang_thai === 'Da_Coc' || d.trang_thai === 'Da_Thanh_Toan'));

        let i = 0;
        while (i < DANH_SACH_MOC_GIO.length) {
            let gioHienTai = DANH_SACH_MOC_GIO[i];

            // Tìm đơn khớp với mốc giờ
            let don = donCuaSan.find(d => d.gio_bat_dau <= gioHienTai && d.gio_ket_thuc > gioHienTai);

            if (don) {
                // Đã tìm thấy đơn -> Tính số ô 30p bị chiếm (Colspan)
                let countColspan = 0;
                for (let j = i; j < DANH_SACH_MOC_GIO.length; j++) {
                    if (DANH_SACH_MOC_GIO[j] < don.gio_ket_thuc) {
                        countColspan++;
                    } else {
                        break;
                    }
                }

                globalMapDonDat[don.id] = { ...don, ten_san: san.ten_san };

                let isGiai = don.loai_dat === 'Giai_Dau';
                let cssClass = isGiai ? 'slot-giai' : 'slot-le';

                trHTML += `<td colspan="${countColspan}" class="${cssClass}" onclick="xemChiTietDon(${don.id})" title="Nhấp để xem chi tiết"></td>`;
                
                i += countColspan; // Nhảy cóc qua các ô đã gộp
            } else {
                // Ô trống
                trHTML += `<td class="slot-free"></td>`;
                i++;
            }
        }

        trHTML += '</tr>';
        bodyBox.innerHTML += trHTML;
    });
}

// 5. NỔ POPUP XEM CHI TIẾT
window.xemChiTietDon = function(donId) {
    const don = globalMapDonDat[donId];
    if (!don) return;

    let isGiai = (don.loai_dat === 'Giai_Dau');

    if (isGiai) {
        // Giải mã gói JSON thông tin Giải Đấu gửi từ Admin Dashboard
        let info = { ten_giai: 'Bao Sân Giải Đấu', don_vi: 'Ban Tổ Chức', hop_dong: 0 };
        try { 
            if (don.ghi_chu) info = JSON.parse(don.ghi_chu); 
        } catch(e) {
            console.log("Không giải mã được JSON ghi chú:", e);
        }

        document.getElementById('dt-tieu-de').innerText = `🏆 GIẢI ĐẤU: ${info.ten_giai}`;
        document.getElementById('dt-khach-ten').innerText = don.khach_hang?.ten || 'Admin / BTC';
        document.getElementById('dt-khach-sdt').innerText = don.khach_hang?.so_dien_thoai || 'N/A';
        document.getElementById('dt-khach-sdt').href = `tel:${don.khach_hang?.so_dien_thoai || ''}`;
        
        document.getElementById('box-don-vi').style.display = 'block';
        document.getElementById('dt-don-vi').innerText = info.don_vi;

        document.getElementById('dt-san-ten').innerText = don.ten_san;
        document.getElementById('dt-thoi-gian').innerText = `${don.gio_bat_dau} - ${don.gio_ket_thuc}`;

        document.getElementById('box-tong-tien').style.display = 'none'; 
        document.getElementById('box-hop-dong').style.display = 'block';
        document.getElementById('dt-tong-hd').innerText = (parseInt(info.hop_dong) || 0).toLocaleString() + " VNĐ";

    } else {
        // Giao diện POPUP KHÁCH LẺ
        document.getElementById('dt-tieu-de').innerText = `⚽ ĐƠN ĐẶT SÂN LẺ #${don.id}`;
        document.getElementById('dt-khach-ten').innerText = don.khach_hang?.ten || 'Khách Lẻ';
        document.getElementById('dt-khach-sdt').innerText = don.khach_hang?.so_dien_thoai || 'N/A';
        document.getElementById('dt-khach-sdt').href = `tel:${don.khach_hang?.so_dien_thoai || ''}`;

        document.getElementById('box-don-vi').style.display = 'none';

        document.getElementById('dt-san-ten').innerText = don.ten_san;
        document.getElementById('dt-thoi-gian').innerText = `${don.gio_bat_dau} - ${don.gio_ket_thuc}`;

        document.getElementById('box-tong-tien').style.display = 'block';
        document.getElementById('dt-tong-tien').innerText = (don.tong_tien || 0).toLocaleString() + " VNĐ";
        document.getElementById('box-hop-dong').style.display = 'none';
    }

    document.getElementById('modal-chitiet-don').style.display = 'flex';
};
// Đóng Popup
document.getElementById('btn-dong-modal-don').onclick = () => document.getElementById('modal-chitiet-don').style.display = 'none';
document.getElementById('btn-dong-popup').onclick = () => document.getElementById('modal-chitiet-don').style.display = 'none';

// Sự kiện chọn ngày
inputNgay.addEventListener('change', function() { taiMaTranhLich(this.value); });
document.getElementById('btn-hom-nay').onclick = function() {
    inputNgay.value = todayStr;
    taiMaTranhLich(todayStr);
};


// Tải lịch lần đầu
taiMaTranhLich(todayStr);
// THÊM MỚI: Hàm chuyển ngày (Trái / Phải)
// =========================================================
// THAY THẾ 2 HÀM NÀY Ở CUỐI FILE JS CỦA SẾP
// =========================================================

// HÀM CHUYỂN NGÀY LỊCH (TRÁI / PHẢI) - ĐÃ FIX ĐÚNG ID & TÊN HÀM
window.chuyenNgayLich = function(deltaDays) {
    const inputElem = document.getElementById('select-ngay-xem'); // 👈 Đã sửa đúng ID
    if (!inputElem) return;

    let curVal = inputElem.value;
    
    // Tách chuỗi YYYY-MM-DD để tránh lỗi lệch múi giờ UTC
    let parts = curVal ? curVal.split('-') : [];
    let d = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date();

    // Cộng / Trừ ngày
    d.setDate(d.getDate() + deltaDays);

    let year = d.getFullYear();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    
    let ngayMoiStr = `${year}-${month}-${day}`;
    inputElem.value = ngayMoiStr;

    // Gọi lại đúng hàm tải ma trận lịch
    if (typeof taiMaTranhLich === 'function') {
        taiMaTranhLich(ngayMoiStr); // 👈 Đã sửa đúng tên hàm
    }
};

// HÀM NHẢY NHANH VỀ HÔM NAY
window.veNgayHomNayLich = function() {
    const inputElem = document.getElementById('select-ngay-xem'); // 👈 Đã sửa đúng ID
    if (!inputElem) return;

    let now = new Date();
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');

    let ngayMoiStr = `${year}-${month}-${day}`;
    inputElem.value = ngayMoiStr;

    if (typeof taiMaTranhLich === 'function') {
        taiMaTranhLich(ngayMoiStr); // 👈 Đã sửa đúng tên hàm
    }
};