const phienUserAdmin = localStorage.getItem('user');
if (!phienUserAdmin) { alert("Vui lòng đăng nhập tài khoản Admin!"); window.location.href = 'login.html'; }
const userAdmin = JSON.parse(phienUserAdmin);
if (userAdmin.vai_tro !== 'Admin' && userAdmin.vai_tro !== 'admin') { alert("Không có quyền!"); window.location.href = 'index.html'; }

document.getElementById('vung-tai-khoan-admin').innerHTML = `
    <span style="color: #ff9800; font-weight: bold; margin-right: 10px;">👋 Sếp: ${userAdmin.ten}</span>
    <a href="#" id="nut-dang-xuat-admin" style="color: #ff5722; text-decoration: none; font-size: 13px; font-weight: bold;">[Đăng xuất]</a>
`;
document.getElementById('nut-dang-xuat-admin').onclick = () => { localStorage.removeItem('user'); window.location.href = 'login.html'; };

window.danhSachGiaiDauAdmin = [];
window.danhSachSanBong = [];

// Tải danh sách sân
fetch('http://127.0.0.1:5000/api/pitch/get-pitches')
    .then(res => res.json())
    .then(data => window.danhSachSanBong = data);

function lamMoiToanBoDuLieu() { taiDonLe(); taiDonGiaiDau(); }

let hienThiToanBoLe = false;
let hienThiToanBoGiai = false;

// ==============================================================================
// 1. TẢI VÀ HIỂN THỊ ĐƠN ĐẶT SÂN LẺ
// ==============================================================================
function taiDonLe() {
    fetch('http://127.0.0.1:5000/api/booking/all-bookings')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('bang-don-hang'); 
            tbody.innerHTML = '';
            
            const listDonLeThucSu = (data || []).filter(don => don.loai_dat !== 'Giai_Dau' && (!don.ghi_chu || !don.ghi_chu.includes('hop_dong')));

            if (!listDonLeThucSu || listDonLeThucSu.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#999;">Chưa có đơn đặt sân lẻ nào.</td></tr>';
                catNhatNutXemThem('box-nut-le', 0, false);
                return;
            }

            const danhSachHienThi = hienThiToanBoLe ? listDonLeThucSu : listDonLeThucSu.slice(0, 5);

            danhSachHienThi.forEach(don => {
                let statusClass = 'st-trang', statusText = 'Chưa báo cọc';
                let actionHtml = `<button class="btn" style="background:#ffc107; color:black;" onclick="doiTrangThaiDonLe(${don.id}, 'Dang_Xet')">Giả lập Khách báo cọc</button>`;

                if (don.trang_thai === 'Dang_Xet') {
                    statusClass = 'st-vang'; statusText = '⏳ Đang Xét';
                    actionHtml = `
                        <button class="btn btn-chot" onclick="doiTrangThaiDonLe(${don.id}, 'Da_Coc')">✅ Duyệt cọc</button>
                        <button class="btn btn-huy" onclick="doiTrangThaiDonLe(${don.id}, 'Da_Huy')">❌ Từ chối</button>
                    `;
                } else if (don.trang_thai === 'Da_Coc') {
                    statusClass = 'st-xanh'; statusText = '✅ Đã Cọc'; actionHtml = `<b style="color: green;">Đã chốt sân</b>`;
                } else if (don.trang_thai === 'Yeu_Cau_Huy') {
                    statusClass = 'st-cam'; statusText = '💸 Khách yêu cầu hủy';
                    actionHtml = `<button class="btn btn-hoan" onclick="moPopupHoanTien(${don.id}, '${don.ngan_hang_hoan_tien}', '${don.stk_hoan_tien}', '${don.chu_tk_hoan_tien}', ${don.tong_tien})">💰 Hoàn Tiền QR</button>`;
                } else if (don.trang_thai === 'Da_Huy') {
                    statusClass = 'st-huy'; statusText = 'Đã Hủy'; actionHtml = `<span style="color: gray;">Đã hoàn hủy</span>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><b>#${don.id}</b></td>
                        <td>
                            <button type="button" class="btn-user-tag" onclick="xemThongTinLienHe('${don.ten_khach}', '${don.so_dien_thoai}', '${don.email || ''}', 'Khách đá lẻ')" title="Bấm để xem liên hệ" style="background:#e0e7ff; color:#4338ca; border:1px solid #c7d2fe; padding:4px 10px; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer; transition:0.2s;">
                                👤 ${don.ten_khach}
                            </button>
                        </td>
                        <td>${don.ten_san}</td>
                        <td>${don.ngay_da}</td>
                        <td style="color:#17b978; font-weight:bold;">${don.gio_bat_dau} - ${don.gio_ket_thuc}</td>
                        <td style="color:#ff5722; font-weight:bold;">${don.tong_tien ? don.tong_tien.toLocaleString() : 0}đ</td>
                        <td><span class="status ${statusClass}">${statusText}</span></td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            });

            catNhatNutXemThem('box-nut-le', listDonLeThucSu.length, hienThiToanBoLe, () => {
                hienThiToanBoLe = !hienThiToanBoLe;
                taiDonLe();
            });
        });
}

// ==============================================================================
// 2. TẢI VÀ HIỂN THỊ DANH SÁCH GIẢI ĐẤU (CÓ NÚT HIGHLIGHT LIÊN HỆ)
// ==============================================================================
function taiDonGiaiDau() {
    fetch('http://127.0.0.1:5000/api/booking/all-tournaments')
        .then(res => res.json())
        .then(data => {
            window.danhSachGiaiDauAdmin = data;
            const tbody = document.getElementById('bang-giai-dau'); 
            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#999;">Chưa có yêu cầu giải đấu nào.</td></tr>';
                catNhatNutXemThem('box-nut-giai', 0, false);
                return;
            }

            const danhSachHienThi = hienThiToanBoGiai ? data : data.slice(0, 5);

            danhSachHienThi.forEach(giai => {
                let statusClass = 'st-trang', statusText = '📞 Chờ tư vấn';
                let actionHtml = `
                    <button class="btn btn-giai" onclick="moPopupChotGiai(${giai.id})" style="background:#17b978; color:white; margin-bottom:5px;">🤝 Chốt HĐ & Khóa Lịch</button><br>
                    <button class="btn btn-huy" onclick="tuChoiGiai(${giai.id})">Từ chối</button>
                `;
                if (giai.trang_thai === 'Cho_Tu_Van' || giai.trang_thai === 'Cho_Duyet') { statusClass = 'st-vang'; statusText = '⏳ Chờ duyệt'; } 
                else if (giai.trang_thai === 'Da_Ky_Hop_Dong') { statusClass = 'st-xanh'; statusText = '🖋️ Đã Ký Hợp Đồng'; actionHtml = `<b style="color: #ff9800;">🎉 Sắp khởi tranh</b>`; } 
                else if (giai.trang_thai === 'Tu_Choi') { statusClass = 'st-huy'; statusText = 'Đã Hủy'; actionHtml = `<span style="color: gray;">Hủy kèo giải</span>`; }

                tbody.innerHTML += `
                    <tr>
                        <td><b>#G-${giai.id}</b></td>
                        <td>
                            <button type="button" class="btn-user-tag" onclick="xemThongTinLienHe('${giai.ten_khach}', '${giai.so_dien_thoai}', '${giai.email || ''}', '${giai.don_vi_to_chuc || ''}')" title="Bấm để xem thông tin liên hệ" style="background:#e0e7ff; color:#4338ca; border:1px solid #c7d2fe; padding:4px 10px; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer; transition:0.2s;">
                                👤 ${giai.ten_khach}
                            </button>
                        </td>
                        <td><b style="color:#ff9800;">${giai.ten_giai}</b></td>
                        <td>${giai.ten_san}</td>
                        <td>Từ: ${giai.ngay_khai_mac}<br>Đến: ${giai.ngay_be_mac}</td>
                        <td>
                            <p style="max-width:200px; font-size:12px; margin:0; color:#555;">
                                <b>Yêu cầu:</b> ${giai.yeu_cau_them || 'Không'}<br>
                                <b style="color:#17b978;">Lịch:</b><br>${(giai.lich_du_kien || '').replace(/\n/g, '<br>')}
                            </p>
                        </td>
                        <td><span class="status ${statusClass}">${statusText}</span></td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            });

            catNhatNutXemThem('box-nut-giai', data.length, hienThiToanBoGiai, () => {
                hienThiToanBoGiai = !hienThiToanBoGiai;
                taiDonGiaiDau();
            });
        });
}

function catNhatNutXemThem(boxId, tongSo, dangMo, callbackOnClick) {
    let boxElem = document.getElementById(boxId);
    if (!boxElem) return;

    if (tongSo <= 5) {
        boxElem.innerHTML = '';
        return;
    }

    const textNut = dangMo 
        ? `🔼 Thu gọn (Đang hiện toàn bộ ${tongSo} đơn)` 
        : `🔽 Xem tất cả ${tongSo} đơn hàng (Còn ${tongSo - 5} đơn nữa)`;

    boxElem.innerHTML = `
        <button type="button" class="btn-xem-them-don" style="background:#1e3d59; color:white; border:none; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer; margin-top:10px; transition:0.2s;">
            ${textNut}
        </button>
    `;

    boxElem.querySelector('.btn-xem-them-don').onclick = callbackOnClick;
}

window.doiTrangThaiDonLe = function(don_id, trang_thai_moi) {
    fetch('http://127.0.0.1:5000/api/booking/update-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ don_id: String(don_id), trang_thai: trang_thai_moi })
    }).then(() => lamMoiToanBoDuLieu());
}

window.tuChoiGiai = function(giai_id) {
    fetch('http://127.0.0.1:5000/api/booking/update-tournament-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giai_id: giai_id, trang_thai: 'Tu_Choi' })
    }).then(() => lamMoiToanBoDuLieu());
}

// ==============================================================================
// 3. POPUP XEM CHI TIẾT LIÊN HỆ (TÊN, SĐT, EMAIL, ĐƠN VỊ)
// ==============================================================================
window.xemThongTinLienHe = function(ten, sdt, email, donVi) {
    const sdtClean = (sdt || '').toString().trim().replace(/\s+/g, '');
    const coSdt = sdtClean && sdtClean !== 'Chưa cập nhật';
    const coEmail = email && email.trim() !== '' && email !== 'None';

    const modalHtml = `
        <div id="modal-lien-he-khach" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:99999;">
            <div style="background:white; padding:24px; border-radius:12px; width:330px; text-align:center; box-shadow:0 8px 25px rgba(0,0,0,0.25); font-family:sans-serif;">
                <div style="font-size:36px; margin-bottom:6px;">📇</div>
                <h3 style="margin:0 0 4px 0; color:#1e3d59; font-size:18px;">${ten}</h3>
                <p style="margin:0 0 16px 0; color:#64748b; font-size:13px;">Đơn vị: <b>${donVi || 'Tự do'}</b></p>
                
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; text-align:left; font-size:13px; margin-bottom:16px;">
                    <div style="margin-bottom:8px;">
                        <b>📞 Số điện thoại:</b><br>
                        ${coSdt ? `<a href="tel:${sdtClean}" style="color:#17b978; font-weight:bold; text-decoration:none; font-size:14px; display:inline-block; margin-top:2px;">📱 ${sdt}</a>` : `<span style="color:#94a3b8; font-style:italic;">Chưa cập nhật</span>`}
                    </div>
                    <div>
                        <b>✉️ Email:</b><br>
                        ${coEmail ? `<a href="mailto:${email}" style="color:#2563eb; text-decoration:none; font-weight:500; word-break:break-all; display:inline-block; margin-top:2px;">📧 ${email}</a>` : `<span style="color:#94a3b8; font-style:italic;">Không có</span>`}
                    </div>
                </div>

                <div style="display:flex; gap:8px;">
                    ${coSdt ? `
                        <a href="tel:${sdtClean}" style="flex:1; background:#17b978; color:white; text-decoration:none; padding:8px 0; border-radius:6px; font-weight:bold; font-size:13px; display:inline-block; line-height:20px;">
                            📞 Gọi điện
                        </a>
                    ` : ''}
                    <button onclick="document.getElementById('modal-lien-he-khach').remove()" style="flex:1; background:#64748b; color:white; border:none; padding:8px 0; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalCu = document.getElementById('modal-lien-he-khach');
    if (modalCu) modalCu.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ==============================================================================
// 4. POPUP CHỐT GIẢI ĐẤU & TỰ ĐỘNG KHÓA LỊCH
// ==============================================================================
let giaiDangChot = null;

window.moPopupChotGiai = function(giai_id) {
    giaiDangChot = window.danhSachGiaiDauAdmin.find(g => g.id === giai_id);
    if(!giaiDangChot) return;
    
    document.getElementById('chitiet-khach-yeu-cau').innerText = 
        "Giải: " + giaiDangChot.ten_giai + 
        "\nYêu cầu đặc biệt: " + (giaiDangChot.yeu_cau_them || "Không có") + 
        "\nLịch khách chọn:\n" + (giaiDangChot.lich_du_kien || "Chưa chọn lịch cụ thể");
    
    const boxContainer = document.getElementById('admin-khoa-lich-box');
    boxContainer.innerHTML = '';

    let textLich = giaiDangChot.lich_du_kien || "";
    let lines = textLich.split('\n');
    let hasSuggestedRows = false;

    lines.forEach(line => {
        if(line.includes('- Ngày:')) {
            let parts = line.split('|');
            let datePart = parts[0] ? parts[0].replace('- Ngày:', '').trim() : '';
            let buoiPart = parts[1] ? parts[1].replace('Đăng ký:', '').trim() : '';

            let tuGio = "08:00", denGio = "10:00";
            if (buoiPart.includes("Sáng")) { tuGio = "05:00"; denGio = "11:00"; }
            else if (buoiPart.includes("Chiều")) { tuGio = "14:00"; denGio = "17:00"; }
            else if (buoiPart.includes("Tối")) { tuGio = "17:00"; denGio = "23:00"; }
            else if (buoiPart.includes("Cả ngày")) { tuGio = "05:00"; denGio = "23:00"; }
            if(datePart) {
                hasSuggestedRows = true;
                themDongKhoaLich(datePart, tuGio, denGio);
            }
        }
    });

    if(!hasSuggestedRows) {
        themDongKhoaLich(giaiDangChot.ngay_khai_mac, "08:00", "11:00");
        if(giaiDangChot.ngay_be_mac !== giaiDangChot.ngay_khai_mac) {
            themDongKhoaLich(giaiDangChot.ngay_be_mac, "14:00", "17:00");
        }
    }

    document.getElementById('modal-chot-giai').style.display = 'flex';
}

function themDongKhoaLich(ngayVal = "", tuVal = "08:00", denVal = "10:00") {
    const boxContainer = document.getElementById('admin-khoa-lich-box');
    boxContainer.insertAdjacentHTML('beforeend', `
        <div class="admin-ca-row" style="display:flex; gap:10px; margin-bottom:10px;">
            <input type="date" class="ad-ngay" value="${ngayVal}" style="padding:8px; border:1px solid #ccc; flex:1;" required>
            <input type="time" class="ad-tu" value="${tuVal}" style="padding:8px; border:1px solid #ccc; width:110px;" required>
            <input type="time" class="ad-den" value="${denVal}" style="padding:8px; border:1px solid #ccc; width:110px;" required>
            <button type="button" onclick="this.parentElement.remove()" style="background:#ff5722; color:white; border:none; border-radius:4px; padding:5px; cursor:pointer;">❌</button>
        </div>
    `);
}

document.getElementById('btn-admin-them-ca').onclick = () => themDongKhoaLich();
document.getElementById('btn-dong-modal-giai').onclick = () => document.getElementById('modal-chot-giai').style.display = 'none';

document.getElementById('btn-luu-chot-giai').onclick = async function() {
    const giaThoaThuan = document.getElementById('gia_thoa_thuan').value;
    const cacRow = document.querySelectorAll('.admin-ca-row');
    
    let sanObj = window.danhSachSanBong.find(s => s.ten_san === giaiDangChot.ten_san);
    let sanIdDeKhoa = sanObj ? sanObj.id : 1;

    let datesMap = {};
    cacRow.forEach(row => {
        let d = row.querySelector('.ad-ngay').value;
        let tu = row.querySelector('.ad-tu').value;
        let den = row.querySelector('.ad-den').value;
        if(d && tu && den) {
            if(!datesMap[d]) datesMap[d] = [];
            datesMap[d].push({ bat_dau: tu, ket_thuc: den, tien: 0 }); 
        }
    });

    this.innerText = "Đang kiểm tra & khóa lịch..."; this.disabled = true;

    let biTrung = false;
    let thongBaoLoi = "";

    for (let date in datesMap) {
        for (let ca of datesMap[date]) {
            try {
                let res = await fetch(`http://127.0.0.1:5000/api/booking/get-slots?san_id=${sanIdDeKhoa}&ngay_da=${date}`);
                let slots = await res.json();
                
                let isOverlap = slots.some(s => s.trang_thai === 'Da_Coc' && (ca.bat_dau < s.ket_thuc && ca.ket_thuc > s.bat_dau));
                if (isOverlap) {
                    biTrung = true;
                    thongBaoLoi = `⚠️ Ngày ${date} (Khung giờ ${ca.bat_dau} - ${ca.ket_thuc}) đã có đơn cọc khác hoặc giải khác khóa trước rồi! Sếp chỉnh lại giờ nhé.`;
                    break;
                }
            } catch(e) {}
        }
        if (biTrung) break;
    }

    if (biTrung) {
        alert(thongBaoLoi);
        this.innerText = "Lưu Hợp Đồng & Khóa Sân"; this.disabled = false;
        return;
    }

    let thongTinGiai = JSON.stringify({
        ten_giai: giaiDangChot.ten_giai,
        don_vi: giaiDangChot.don_vi_to_chuc,
        hop_dong: giaThoaThuan
    });
    let promises = [];
    for(let date in datesMap) {
        let payload = {
            user_id: giaiDangChot.user_id || userAdmin.id,
            san_id: sanIdDeKhoa,
            ngay_da: date,
            loai_dat: 'Giai_Dau',
            ghi_chu: thongTinGiai,
            danh_sach_ca: datesMap[date]
        };
        
        let p = fetch('http://127.0.0.1:5000/api/booking/book', { 
            method: 'POST', body: JSON.stringify(payload), headers: {'Content-Type': 'application/json'} 
        })
        .then(r => r.json())
        .then(res => {
            if(res.don_id) {
                return fetch('http://127.0.0.1:5000/api/booking/update-status', { 
                    method: 'POST', body: JSON.stringify({don_id: res.don_id, trang_thai: 'Da_Coc'}), headers: {'Content-Type': 'application/json'} 
                });
            }
        });
        promises.push(p);
    }

    Promise.all(promises).then(() => {
        fetch('http://127.0.0.1:5000/api/booking/update-tournament-status', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ giai_id: giaiDangChot.id, trang_thai: 'Da_Ky_Hop_Dong', gia_thoa_thuan: parseFloat(giaThoaThuan) })
        }).then(() => {
            alert("🎉 Đã duyệt hợp đồng giải đấu và tự động khóa lịch báo đỏ sân thành công!");
            document.getElementById('modal-chot-giai').style.display = 'none';
            this.innerText = "Lưu Hợp Đồng & Khóa Sân"; this.disabled = false;
            lamMoiToanBoDuLieu();
        });
    });
};

// ==============================================================================
// 5. POPUP HOÀN TIỀN QR & XỬ LÝ BÁO SAI STK
// ==============================================================================
window.moPopupHoanTien = function(donId, nganHang, stk, chuTk, tongTien) {
    const tienHoan = (tongTien || 0) * 0.5;
    
    const bankClean = nganHang || 'MBBank';
    const stkClean = (stk || '').toString().trim();
    const nameClean = (chuTk || 'KHACH HANG').toUpperCase();

    const qrUrl = `https://img.vietqr.io/image/${bankClean}-${stkClean}-compact2.png?amount=${tienHoan}&addInfo=Hoan%20tiencoc%20don%20${donId}&accountName=${encodeURIComponent(nameClean)}`;

    const modalHtml = `
        <div id="modal-hoan-tien" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div style="background:white; padding:20px; border-radius:8px; width:360px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
                <h3 style="color:#17b978; margin-top:0;">💰 HOÀN TIỀN CỌC (50%)</h3>
                <div style="font-size:13px; color:#555; text-align:left; background:#f9f9f9; padding:10px; border-radius:6px; margin-bottom:15px; border:1px solid #eee;">
                    <b>Mã đơn:</b> #${donId}<br>
                    <b>Chủ TK:</b> <span style="color:#ff9800; font-weight:bold;">${nameClean}</span><br>
                    <b>STK:</b> <span style="color:#17b978; font-weight:bold;">${stkClean}</span> (${bankClean})<br>
                    <b>Số tiền hoàn (50%):</b> <b style="color:#ff5722; font-size:15px;">${tienHoan.toLocaleString()}đ</b>
                </div>
                
                <img src="${qrUrl}" alt="Mã VietQR Hoàn Tiền" style="width:210px; height:210px; border:1px solid #ddd; padding:5px; border-radius:5px; margin-bottom:15px;">
                
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button onclick="xacNhanXongHoanTien(${donId})" style="background:#17b978; color:white; border:none; padding:10px; border-radius:5px; font-weight:bold; cursor:pointer;">
                        ✅ Bắn Tiền Xong & Duyệt Hủy
                    </button>
                    <button onclick="baoSaiTaiKhoan(${donId})" style="background:#ff9800; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                        ⚠️ STK Sai - Báo Khách Nhập Lại
                    </button>
                    <button onclick="document.getElementById('modal-hoan-tien').remove()" style="background:#666; color:white; border:none; padding:6px; border-radius:5px; cursor:pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalCu = document.getElementById('modal-hoan-tien');
    if (modalCu) modalCu.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.xacNhanXongHoanTien = function(donId) {
    if (!confirm("Sếp đã bắn tiền hoàn thành công cho khách rồi đúng không?")) return;
    
    fetch('http://127.0.0.1:5000/api/booking/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ don_id: String(donId), trang_thai: 'Da_Huy' })
    }).then(() => {
        alert("🎉 Đã hoàn tiền và đóng đơn thành công!");
        document.getElementById('modal-hoan-tien').remove();
        lamMoiToanBoDuLieu();
    });
};

window.baoSaiTaiKhoan = function(donId) {
    if (!confirm("Báo lỗi STK sai để trả đơn về cho Khách nhập lại?")) return;

    fetch('http://127.0.0.1:5000/api/booking/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ don_id: String(donId), trang_thai: 'Sai_STK' })
    }).then(() => {
        alert("⚠️ Đã báo sai STK! Đơn đã chuyển trạng thái yêu cầu khách cập nhật lại.");
        document.getElementById('modal-hoan-tien').remove();
        lamMoiToanBoDuLieu();
    });
};

lamMoiToanBoDuLieu();