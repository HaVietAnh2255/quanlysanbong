// Kiểm tra quyền Admin
const phienUserAdmin = localStorage.getItem('user');
if (!phienUserAdmin) { alert("Vui lòng đăng nhập Admin!"); window.location.href = 'login.html'; }
const userAdmin = JSON.parse(phienUserAdmin);
if (userAdmin.vai_tro !== 'Admin' && userAdmin.vai_tro !== 'admin') { alert("Không có quyền!"); window.location.href = 'index.html'; }

const vungTaiKhoanAdmin = document.getElementById('vung-tai-khoan-admin');
if (vungTaiKhoanAdmin) {
    vungTaiKhoanAdmin.innerHTML = `
        <span style="color: #ff9800; font-weight: bold; margin-right: 10px;">👋 Sếp: ${userAdmin.ten}</span>
        <a href="#" id="nut-dang-xuat-admin" style="color: #ff5722; text-decoration: none; font-size: 13px; font-weight: bold;">[Đăng xuất]</a>
    `;
    document.getElementById('nut-dang-xuat-admin').addEventListener('click', function(e) {
        e.preventDefault(); localStorage.removeItem('user'); window.location.href = 'login.html';
    });
}

const cacKhungGio = [
    "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30",
    "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
    "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", "24:00"
];

function taoDanhSachOption(gioDuocChon = '') {
    let optionsHTML = '';
    cacKhungGio.forEach(gio => {
        let selected = (gio === gioDuocChon) ? 'selected' : '';
        optionsHTML += `<option value="${gio}" ${selected}>${gio}</option>`;
    });
    return optionsHTML;
}

let sanHienTaiId = null;
let courtFileListToUpload = []; // Mảng chứa danh sách ảnh chọn từ máy tính

// 1. MỞ MODAL THÊM SÂN
window.moModalSan = function() {
    sanHienTaiId = null; 
    courtFileListToUpload = [];
    document.getElementById('form-san-bong').reset(); 
    document.getElementById('edit-san-id').value = '';
    document.getElementById('modal-title').innerText = '🏟️ THÊM SÂN BÓNG MỚI';
    document.getElementById('khung-gia-container').innerHTML = ''; 
    document.getElementById('badge-count-court-anh').style.display = 'none';
    document.getElementById('preview-court-anh-upload').innerHTML = '';
    
    themDongKhungGio();
    document.getElementById('modal-san-bong').style.display = 'flex';
}

document.getElementById('btn-dong-modal').onclick = function() { 
    document.getElementById('modal-san-bong').style.display = 'none'; 
}

// 2. KHUNG GIỜ GIÁ
window.themDongKhungGio = function(tu = '05:00', den = '05:30', gia = '') {
    const container = document.getElementById('khung-gia-container'); 
    const rowId = 'row-' + Date.now();
    const row = document.createElement('div'); 
    row.className = 'time-price-row'; 
    row.id = rowId;
    row.innerHTML = `
        <select class="gio-tu" onchange="tuDongCong30Phut('${rowId}')" style="width:100px; padding:8px; border:1px solid #ccc; border-radius:4px;" required>${taoDanhSachOption(tu)}</select>
        <span style="font-weight:bold; color:#666;">👉</span>
        <select class="gio-den" style="width:100px; padding:8px; border:1px solid #ccc; border-radius:4px;" required>${taoDanhSachOption(den)}</select>
        <input type="number" placeholder="Giá tiền" value="${gia}" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
        <button type="button" onclick="this.parentElement.remove()" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">X</button>
    `;
    container.appendChild(row);
}

document.getElementById('btn-them-khung-gio').onclick = () => themDongKhungGio();

window.tuDongCong30Phut = function(rowId) {
    const row = document.getElementById(rowId); 
    const gioTu = row.querySelector('.gio-tu').value;
    const selectGioDen = row.querySelector('.gio-den'); 
    const viTriTu = cacKhungGio.indexOf(gioTu);
    if (viTriTu !== -1 && viTriTu < cacKhungGio.length - 1) selectGioDen.value = cacKhungGio[viTriTu + 1];
}

// 3. XỬ LÝ CHỌN ẢNH SÂN TỪ MÁY TÍNH
document.getElementById('btn-trigger-court-file').onclick = function(e) {
    e.preventDefault();
    document.getElementById('input-files-court-anh').click();
};

document.getElementById('input-files-court-anh').addEventListener('change', function(e) {
    const files = Array.from(this.files);
    if (files.length === 0) return;

    courtFileListToUpload = courtFileListToUpload.concat(files);

    const badge = document.getElementById('badge-count-court-anh');
    badge.style.display = 'inline-block';
    badge.innerText = `+${courtFileListToUpload.length} ảnh`;

    renderCourtPreviewAnh();
});

// HÀM RENDER PREVIEW ẢNH KÈM NÚT XÓA TỪNG TẤM ẢNH
function renderCourtPreviewAnh() {
    const preview = document.getElementById('preview-court-anh-upload');
    preview.innerHTML = '';
    
    courtFileListToUpload.forEach((file, index) => {
        const blobUrl = (typeof file === 'string') ? (file.startsWith('./images') ? file : `./images/${file}`) : URL.createObjectURL(file);
        
        preview.innerHTML += `
            <div style="position:relative; display:inline-block; margin-right:8px; margin-bottom:8px;">
                <img src="${blobUrl}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 2px solid #ff9800;">
                <button type="button" onclick="xoaMotAnhTrongForm(${index})" style="position:absolute; top:-6px; right:-6px; background:#dc3545; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; font-weight:bold; cursor:pointer; line-height:18px; text-align:center;">&times;</button>
            </div>
        `;
    });

    const badge = document.getElementById('badge-count-court-anh');
    if (badge) {
        badge.style.display = courtFileListToUpload.length > 0 ? 'inline-block' : 'none';
        badge.innerText = `+${courtFileListToUpload.length} ảnh`;
    }
}

// XÓA 1 TẤM ẢNH BẤT KỲ TRONG KHU VỰC PREVIEW
window.xoaMotAnhTrongForm = function(index) {
    courtFileListToUpload.splice(index, 1);
    renderCourtPreviewAnh();
};

// 4. TẢI DANH SÁCH SÂN BÓNG
function taiDanhSachSanBong() {
    fetch('http://127.0.0.1:5000/api/pitch/admin/get-courts') 
        .then(res => res.json())
        .then(result => {
            if (result.status === "success") {
                const box = document.getElementById('danh-sach-san-box'); 
                let htmlSan = '';
                result.data.forEach(san => {
                    let isBaoTri = (san.trang_thai === 'Bao_Tri');
                    let stClass = isBaoTri ? 'status-maintenance' : 'status-active';
                    let stText = isBaoTri ? '🛠️ Đang bảo trì' : '✅ Đang hoạt động';
                    
                    let nutBaoTriHTML = isBaoTri 
                        ? `<button class="btn-action" style="background:#17b978;" onclick="thayDoiTrangThaiSan(${san.id}, 'Hoat_Dong')">🔓 Khôi phục sân</button>`
                        : `<button class="btn-action btn-delete" onclick="thayDoiTrangThaiSan(${san.id}, 'Bao_Tri')">🛠️ Bảo trì</button>`;
                    
                    let nutXoaVinhVienHTML = `<button class="btn-action" style="background:#111; color:#ff3333; border:1px solid #ff3333;" onclick="xoaVinhVienSan(${san.id}, '${san.ten_san}')">🗑️ Xóa Sân</button>`;

                    let hinhAnh = (san.anh_san || '').startsWith('./images') ? san.anh_san : `./images/${san.anh_san || 'default_pitch.jpg'}`;

                    htmlSan += `
                        <div class="court-card" style="${isBaoTri ? 'opacity:0.8; border:1px dashed #dc3545;' : ''}">
                            <!-- Dùng onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=No+Image'" để chặn vòng lặp 404 -->
                            <img src="${hinhAnh}" class="court-img" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=No+Image';">
                            <div class="court-info">
                                <div class="court-name">${san.ten_san}</div>
                                <div class="court-address">📍 ${san.dia_chi || 'Chưa cập nhật'}</div>
                                <div class="court-status ${stClass}">${stText}</div>
                            </div>
                            <div class="card-actions">
                                <button class="btn-action btn-edit" onclick="suaSan(${san.id})">✏️ Sửa</button>
                                ${nutBaoTriHTML} ${nutXoaVinhVienHTML}
                            </div>
                        </div>
                    `;
                });
                htmlSan += `<div class="court-card add-btn-card" onclick="moModalSan()"><div class="add-icon">+</div><div class="add-text">THÊM SÂN BÓNG MỚI</div></div>`;
                box.innerHTML = htmlSan;
            }
        });
}
taiDanhSachSanBong();

function kiemTraVaBaoDoKhungGio(danhSachKhungGio, danhSachDongElement) {
    // Reset màu viền tất cả các dòng về bình thường trước khi check
    danhSachDongElement.forEach(row => {
        row.querySelector('.gio-tu').style.border = '1px solid #ccc';
        row.querySelector('.gio-den').style.border = '1px solid #ccc';
    });

    for (let i = 0; i < danhSachKhungGio.length; i++) {
        const kg1 = danhSachKhungGio[i];

        // Check logic: Giờ bắt đầu phải nhỏ hơn giờ kết thúc
        if (kg1.tu >= kg1.den) {
            const rowErr = danhSachDongElement[i];
            rowErr.querySelector('.gio-tu').style.border = '2px solid #dc3545';
            rowErr.querySelector('.gio-den').style.border = '2px solid #dc3545';
            alert(`⚠️ Lỗi khung giờ #${i + 1}: Giờ bắt đầu (${kg1.tu}) phải nhỏ hơn giờ kết thúc (${kg1.den})!`);
            return false;
        }

        // Check trùng lặp giữa các cặp khung giờ (Max < Min)
        for (let j = i + 1; j < danhSachKhungGio.length; j++) {
            const kg2 = danhSachKhungGio[j];

            const maxTu = kg1.tu > kg2.tu ? kg1.tu : kg2.tu;
            const minDen = kg1.den < kg2.den ? kg1.den : kg2.den;

            if (maxTu < minDen) {
                // TÔ ĐỎ VIỀN KHUNG GIỜ CỦA CẢ 2 DÒNG BỊ TRÙNG
                const row1 = danhSachDongElement[i];
                const row2 = danhSachDongElement[j];

                row1.querySelector('.gio-tu').style.border = '2px solid #dc3545';
                row1.querySelector('.gio-den').style.border = '2px solid #dc3545';
                row2.querySelector('.gio-tu').style.border = '2px solid #dc3545';
                row2.querySelector('.gio-den').style.border = '2px solid #dc3545';

                alert(
                    `⚠️ LỖI CẤU HÌNH TRÙNG GIỜ:\n\n` +
                    `Khung giờ #${i + 1} (${kg1.tu} ➔ ${kg1.den})\n` +
                    `đang bị CHỒNG CHÉO với\n` +
                    `Khung giờ #${j + 1} (${kg2.tu} ➔ ${kg2.den})\n\n` +
                    `👉 Đoạn bị trùng: từ ${maxTu} đến ${minDen}!\n` +
                    `Vui lòng điều chỉnh lại 2 ô viền ĐỎ trước khi lưu.`
                );
                return false;
            }
        }
    }
    return true;
}

// SUBMIT FORM THÊM / SỬA SÂN (ĐÃ TÍCH HỢP BẮT TRÙNG GIỜ & FIX LỖI SERVER)
document.getElementById('form-san-bong').addEventListener('submit', async function(e) {
    e.preventDefault();

    const danhSachKhungGio = [];
    const danhSachDongElement = Array.from(document.querySelectorAll('.time-price-row'));
    let isError = false;

    danhSachDongElement.forEach(dong => {
        const tu = dong.querySelector('.gio-tu').value;
        const den = dong.querySelector('.gio-den').value;
        const giaVal = dong.querySelector('input[type="number"]').value;

        if (!giaVal || parseInt(giaVal) <= 0) {
            dong.querySelector('input[type="number"]').style.border = '2px solid #dc3545';
            alert("Vui lòng nhập giá tiền hợp lệ (> 0) cho tất cả các khung giờ!");
            isError = true;
            return;
        } else {
            dong.querySelector('input[type="number"]').style.border = '1px solid #ccc';
        }
        danhSachKhungGio.push({ tu, den, gia: parseInt(giaVal) });
    });

    if (isError) return;
    if (danhSachKhungGio.length === 0) {
        alert("Vui lòng thêm ít nhất 1 khung giờ giá!");
        return;
    }

    // THỰC THI KIỂM TRA TRÙNG GIỜ & TÔ ĐỎ NẾU VI PHẠM
    if (!kiemTraVaBaoDoKhungGio(danhSachKhungGio, danhSachDongElement)) {
        return; // Chặn lưu ngay tại đây!
    }

    // Đẩy dữ liệu lên Server nếu hợp lệ
    let danhSachAnhSaved = [];
    const filesToUpload = courtFileListToUpload.filter(f => typeof f !== 'string');

    if (filesToUpload.length > 0) {
        const imageFormData = new FormData();
        filesToUpload.forEach(file => imageFormData.append('files', file));

        try {
            const resUpload = await fetch('http://127.0.0.1:5000/api/pitch/admin/upload-court-images', {
                method: 'POST',
                body: imageFormData
            });
            const uploadResult = await resUpload.json();
            if (uploadResult.status === 'success') {
                danhSachAnhSaved = uploadResult.images;
            }
        } catch (err) {
            alert("Lỗi upload ảnh sân!");
            return;
        }
    } else {
        danhSachAnhSaved = courtFileListToUpload.filter(f => typeof f === 'string');
    }

    if (danhSachAnhSaved.length === 0) {
        danhSachAnhSaved = ['./images/default_pitch.jpg'];
    }

    const data = {
        ten_san: document.getElementById('ten_san').value.trim(),
        dia_chi: document.getElementById('dia_chi').value.trim(),
        mo_ta: document.getElementById('mo_ta').value.trim(),
        gia_mac_dinh: parseInt(document.getElementById('gia_mac_dinh').value) || 300000,
        anh_san: danhSachAnhSaved[0],
        danh_sach_anh: danhSachAnhSaved.join(','),
        khung_gia: danhSachKhungGio
    };

    let url = sanHienTaiId 
        ? `http://127.0.0.1:5000/api/pitch/admin/update-court/${sanHienTaiId}` 
        : 'http://127.0.0.1:5000/api/pitch/admin/add-court';

    try {
        const response = await fetch(url, {
            method: sanHienTaiId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await response.json();

        if (response.ok && resData.status === 'success') {
            alert(resData.message);
            document.getElementById('modal-san-bong').style.display = 'none';
            courtFileListToUpload = [];
            taiDanhSachSanBong();
        } else {
            alert("❌ Lỗi: " + (resData.detail || "Không thể lưu thông tin!"));
        }
    } catch (error) {
        alert("Lỗi kết nối máy chủ!");
    }
});

// 6. BẢO TRÌ ↔ KHÔI PHỤC SÂN
window.thayDoiTrangThaiSan = function(id, trangThaiMoi) {
    fetch('http://127.0.0.1:5000/api/pitch/admin/toggle-maintenance', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ san_id: id, trang_thai: trangThaiMoi }) 
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message || "Đã cập nhật trạng thái sân!");
        taiDanhSachSanBong();
    });
}

// 7. XÓA SÂN THÔNG MINH
window.xoaVinhVienSan = function(id, tenSan) {
    if (confirm(`Bạn có chắc chắn muốn xóa ${tenSan}?\n\n(Lưu ý: Nếu sân đã từng phát sinh dữ liệu trong quá khứ, hệ thống sẽ tự động ẨN SÂN để giữ nguyên báo cáo!)`)) {
        fetch(`http://127.0.0.1:5000/api/pitch/admin/delete-court/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(res => {
            alert(res.message);
            taiDanhSachSanBong();
        });
    }
}

// 8. SỬA THÔNG TIN SÂN (NẠP DỮ LIỆU CŨ LÊN FORM)
window.suaSan = function(id) {
    sanHienTaiId = id;
    fetch(`http://127.0.0.1:5000/api/pitch/admin/get-court/${id}`)
    .then(res => res.json())
    .then(result => {
        if(result.status === 'success') {
            document.getElementById('ten_san').value = result.data.ten_san;
            document.getElementById('dia_chi').value = result.data.dia_chi || '';
            document.getElementById('mo_ta').value = result.data.mo_ta || '';
            document.getElementById('gia_mac_dinh').value = result.data.gia_mac_dinh || 300000;
            // Nạp album ảnh cũ vào mảng preview
            courtFileListToUpload = result.data.danh_sach_anh ? result.data.danh_sach_anh.split(',') : [result.data.anh_san];
            const badge = document.getElementById('badge-count-court-anh');
            badge.style.display = 'inline-block';
            badge.innerText = `+${courtFileListToUpload.length} ảnh`;
            renderCourtPreviewAnh();

            const bangGia = document.getElementById('khung-gia-container'); 
            bangGia.innerHTML = '';
            
            result.data.khung_gia.forEach(kg => {
                bangGia.insertAdjacentHTML('beforeend', `
                    <div class="time-price-row">
                        <select class="gio-tu" style="width:100px; padding:8px; border:1px solid #ccc; border-radius:4px;">${taoDanhSachOption(kg.tu)}</select>
                        <span style="font-weight:bold; color:#666;">👉</span>
                        <select class="gio-den" style="width:100px; padding:8px; border:1px solid #ccc; border-radius:4px;">${taoDanhSachOption(kg.den)}</select>
                        <input type="number" value="${kg.gia}" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        <button type="button" onclick="this.parentElement.remove()" style="background:#ff4444; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold;">X</button>
                    </div>
                `);
            });
            document.getElementById('modal-title').innerText = '🏟️ SỬA THÔNG TIN SÂN';
            document.getElementById('modal-san-bong').style.display = 'flex';
        }
    });
}

// 9. CẤU HÌNH LIÊN HỆ
function taiCauHinhHeThong() {
    fetch('http://127.0.0.1:5000/api/pitch/get-config')
        .then(res => res.json())
        .then(resObj => {
            if (resObj.status === 'success') {
                document.getElementById('cfg_fb').value = resObj.data.fb_link || '';
                document.getElementById('cfg_zalo').value = resObj.data.zalo_link || '';
                document.getElementById('cfg_hotline').value = resObj.data.hotline || '';
            }
        });
}
taiCauHinhHeThong();

document.getElementById('form-config-he-thong').addEventListener('submit', function(e) {
    e.preventDefault();
    const configData = {
        fb_link: document.getElementById('cfg_fb').value,
        zalo_link: document.getElementById('cfg_zalo').value,
        hotline: document.getElementById('cfg_hotline').value
    };
    fetch('http://127.0.0.1:5000/api/pitch/admin/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        taiCauHinhHeThong();
    });
});