let danhSachSanKhach = [];
let currentCourtAlbum = [];
let currentCourtImgIdx = 0;

// 1. TẢI DANH SÁCH SÂN BÓNG VÀ LƯU VÀO MẢNG TẠM
fetch('http://127.0.0.1:5000/api/pitch/get-pitches')
    .then(response => response.json())
    .then(data => {
        danhSachSanKhach = data;
        const vungChua = document.getElementById('giao-dien-san');
        if (!vungChua) return;

        if (data.length === 0) {
            vungChua.innerHTML = `<p style="color: #999;">Hiện tại chưa có sân bóng nào hoạt động.</p>`;
            return;
        }

        vungChua.innerHTML = '';
        data.forEach((san, index) => {
            const listAnh = san.danh_sach_anh ? san.danh_sach_anh.split(',') : [san.anh_san || 'default_pitch.jpg'];
            let avatar = listAnh[0];
            avatar = avatar.startsWith('./images') ? avatar : `./images/${avatar.split('/').pop()}`;

            // 🎯 KIỂM TRA TRẠNG THÁI BẢO TRÌ
            const isBaoTri = (san.trang_thai === 'Bao_Tri');

            const card = document.createElement('div'); 
            card.className = 'san-card';
            card.style.position = 'relative';
            card.style.overflow = 'hidden';
            card.style.borderRadius = '8px';
            card.style.cursor = isBaoTri ? 'not-allowed' : 'pointer';
            
            card.innerHTML = `
                <!-- 🎯 NỘI DUNG THẺ SÂN: Bị mờ và vô hiệu hóa click khi bảo trì -->
                <div style="${isBaoTri ? 'filter: grayscale(85%) blur(1px); opacity: 0.5; pointer-events: none;' : ''}">
                    <div onclick="moModalChiTietSan(${index})" title="Nhấp để xem chi tiết sân & Album ảnh">
                        <img src="${avatar}" alt="${san.ten_san}" onerror="this.onerror=null; this.src='https://via.placeholder.com/350x220?text=San+Bong+FC';">
                        <div class="san-info">
                            <h3>🏟️ ${san.ten_san}</h3>
                            <p><b>📍 Địa chỉ:</b> ${san.dia_chi || 'Chưa cập nhật'}</p>
                            <p><b>⚽ Loại sân:</b> ${san.loai_san || 'Sân 7'}</p>
                            <p class="price">💰 ${(san.gia_tien_mac_dinh || 300000).toLocaleString()} VNĐ / ca</p>
                            <p style="color:#17b978; font-size:13px; font-weight:bold; margin-top:5px;">ℹ️ Xem chi tiết tiện ích & Album (${listAnh.length} ảnh) ➔</p>
                        </div>
                    </div>
                    <div style="padding: 0 15px 15px 15px;">
                        <a href="booking.html?san_id=${san.id}" class="btn-dat" style="display:block; text-align:center; text-decoration:none;">📆 Đặt Sân Ngay</a>
                    </div>
                </div>

                <!-- 🎯 LỚP PHỦ OVERLAY BẢO TRÌ (Chỉ hiện khi trạng thái là Bao_Tri) -->
                ${isBaoTri ? `
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.72); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: white; padding: 20px; z-index: 10; box-sizing: border-box;">
                        <div style="font-size: 38px; margin-bottom: 6px;">🛠️</div>
                        <h4 style="margin: 0 0 8px 0; color: #ffc107; font-size: 16px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Sân Đang Bảo Trì</h4>
                        <p style="margin: 0; font-size: 13px; color: #f1f5f9; line-height: 1.4; max-width: 230px;">Sân đang được bảo dưỡng, nâng cấp và sẽ sớm quay lại hoạt động!</p>
                        <span style="margin-top: 12px; display: inline-block; padding: 4px 10px; background: rgba(255, 255, 255, 0.15); border-radius: 20px; font-size: 11px; color: #cbd5e1;">Tạm ngưng nhận lịch đặt</span>
                    </div>
                ` : ''}
            `;
            vungChua.appendChild(card);
        });
    })
    .catch(err => {
        console.error("Lỗi:", err);
        const vungChua = document.getElementById('giao-dien-san');
        if (vungChua) vungChua.innerHTML = `<p style="color: red; font-weight: bold;">Lỗi kết nối tới Server Backend!</p>`;
    });

// 2. POPUP MODAL CHI TIẾT SÂN & SLIDE SHOW TRANG KHÁCH
window.moModalChiTietSan = function(index) {
    const san = danhSachSanKhach[index];
    if (!san) return;

    currentCourtAlbum = san.danh_sach_anh ? san.danh_sach_anh.split(',') : [san.anh_san || 'default_pitch.jpg'];
    currentCourtImgIdx = 0;

    // Nạp thông tin
    document.getElementById('ct-san-ten').innerText = `🏟️ ${san.ten_san}`;
    document.getElementById('ct-san-diachi').innerText = san.dia_chi || 'Chưa cập nhật địa chỉ';
    document.getElementById('ct-san-mota').innerText = san.mo_ta || 'Sân cỏ nhân tạo chất lượng cao, có phục vụ nước uống và bóng thi đấu.';

    // Nạp bảng giá
   // Nạp bảng giá trong Popup Modal
const bgBox = document.getElementById('ct-san-banggia');
if (bgBox) {
    bgBox.innerHTML = '';
    
    // 1. Luôn hiện dòng Giá Mặc Định đầu tiên
    const giaBase = (san.gia_tien_mac_dinh || 300000).toLocaleString();
    bgBox.innerHTML += `<li style="margin-bottom:6px;">💵 Giá mặc định (Các ca thường): <b>${giaBase} VNĐ / ca</b></li>`;

    // 2. Liệt kê các khung giờ cao điểm / giá riêng nếu có
    if (san.khung_gia && san.khung_gia.length > 0) {
        bgBox.innerHTML += `<li style="font-weight:bold; color:#1e3d59; margin-top:8px;">🔥 Các khung giờ áp dụng giá riêng:</li>`;
        san.khung_gia.forEach(kg => {
            bgBox.innerHTML += `<li style="margin-left:15px;">⏰ Ca <b>${kg.tu} - ${kg.den}</b>: <span style="color:#e65100; font-weight:bold;">${parseInt(kg.gia).toLocaleString()} VNĐ</span></li>`;
        });
    }
}

    updateCourtSlideImg();
    
    // Mở modal
    let modal = document.getElementById('modal-chitiet-san-khach');
    if (modal) modal.style.display = 'flex';
};

function updateCourtSlideImg() {
    const imgEl = document.getElementById('court-slide-img');
    const capEl = document.getElementById('court-slide-caption');
    if (imgEl && currentCourtAlbum.length > 0) {
        let src = currentCourtAlbum[currentCourtImgIdx];
        imgEl.src = src.startsWith('./images') ? src : `./images/${src.split('/').pop()}`;
        imgEl.onerror = function() {
            this.onerror = null;
            this.src = 'https://via.placeholder.com/600x350?text=San+Bong+FC';
        };
    }
    if (capEl) {
        capEl.innerText = `Ảnh (${currentCourtImgIdx + 1}/${currentCourtAlbum.length})`;
    }
}

window.nextCourtImg = function() {
    if (currentCourtImgIdx < currentCourtAlbum.length - 1) {
        currentCourtImgIdx++;
        updateCourtSlideImg();
    }
};

window.prevCourtImg = function() {
    if (currentCourtImgIdx > 0) {
        currentCourtImgIdx--;
        updateCourtSlideImg();
    }
};

// 3. TẢI THÔNG TIN LIÊN HỆ DỘNG
function taiThongTinLienHeTrangChu() {
    fetch('http://127.0.0.1:5000/api/pitch/get-config')
        .then(res => res.json())
        .then(resObj => {
            if (resObj.status === 'success') {
                const d = resObj.data;
                const fb = document.getElementById('link_mxh_fb');
                const zalo = document.getElementById('link_mxh_zalo');
                const hotline = document.getElementById('link_mxh_hotline');

                if (fb) fb.href = d.fb_link || '#';
                if (zalo) zalo.href = d.zalo_link || '#';
                if (hotline) {
                    hotline.href = `tel:${d.hotline}`;
                    hotline.innerText = `📞 Hotline: ${d.hotline || 'Chưa cấu hình'}`;
                }
            }
        })
        .catch(err => console.error("Lỗi nạp cấu hình liên hệ:", err));
}
taiThongTinLienHeTrangChu();

// 4. XỬ LÝ NAVBAR KHI ĐĂNG NHẬP
const phienUser = localStorage.getItem('user');
if (phienUser) {
    const user = JSON.parse(phienUser); 
    const vungTaiKhoan = document.getElementById('vung-tai-khoan');
    if (vungTaiKhoan) {
        let nutAdmin = (user.vai_tro === 'Admin' || user.vai_tro === 'admin') 
            ? `<a href="admin_dashboard.html" style="background: #ff9800; color: black; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-right: 15px;">⚙️ Vào Quản Trị</a>` : '';

        vungTaiKhoan.innerHTML = `
            ${nutAdmin} 
            <span style="margin-right: 15px; font-weight: bold; color: #17b978;">👋 Chào, ${user.ten}</span>
            <a href="#" id="nut-dang-xuat" style="color: #ff5722; text-decoration: none; font-size: 14px; font-weight: bold;">[Đăng xuất]</a>
        `;
        
        document.getElementById('nut-dang-xuat').addEventListener('click', function(e) {
            e.preventDefault(); 
            localStorage.removeItem('user'); 
            localStorage.removeItem('token'); 
            window.location.reload();
        });
    }
}