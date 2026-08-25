let danhSachGiaiDaKy = [];
let fileListToUpload = []; // Lưu danh sách các File ảnh thật

document.addEventListener("DOMContentLoaded", function() {
    loadDanhSachGiaiToSelect();
    loadDanhSachVinhDanhTable();

    document.getElementById('btn-trigger-file').onclick = function(e) {
        e.preventDefault();
        document.getElementById('input-files-anh').click();
    };

    // BẮT LỖI NGÀY BẾ MẠC MẠNH MẼ VÀ NGAY LẬP TỨC KHI CHỌN
    const inputKhaiMac = document.getElementById('ngay_khai_mac');
    const inputBeMac = document.getElementById('ngay_be_mac');

    function kiemTraNgayThangHopLe() {
        if (inputKhaiMac.value && inputBeMac.value) {
            if (inputBeMac.value < inputKhaiMac.value) {
                alert("⚠️ ❌ LỖI RÀNG BUỘC NGÀY THÁNG:\nNgày bế mạc (" + inputBeMac.value + ") không thể diễn ra TRƯỚC ngày khai mạc (" + inputKhaiMac.value + ")!\n\nVui lòng chọn lại ngày bế mạc hợp lệ.");
                inputBeMac.value = ""; // Clear ngay ô chọn sai!
                inputBeMac.focus();
            }
        }
    }

    // Tự động thiết lập ngày tối thiểu (min) cho ô bế mạc khi chọn khai mạc
    inputKhaiMac.addEventListener('change', function() {
        if (this.value) {
            inputBeMac.min = this.value;
            kiemTraNgayThangHopLe();
        }
    });

    // Kiểm tra trực tiếp ngay khi vừa bấm chọn ngày bế mạc
    inputBeMac.addEventListener('change', kiemTraNgayThangHopLe);
    inputBeMac.addEventListener('input', kiemTraNgayThangHopLe);
});

// 1. Tải danh sách giải đã ký hợp đồng
function loadDanhSachGiaiToSelect() {
    fetch('http://127.0.0.1:5000/api/pitch/get-approved-tournaments')
        .then(res => res.json())
        .then(data => {
            danhSachGiaiDaKy = data;
            const select = document.getElementById('select-giai-dau');
            select.innerHTML = `
                <option value="">-- Chọn giải gợi ý trong hệ thống --</option>
                <option value="-1">➕ [Thêm Giải Đấu Ngoài Hệ Thống]</option>
            `;
            data.forEach(g => {
                select.innerHTML += `<option value="${g.id}">🏆 ${g.ten_giai} - ${g.don_vi_to_chuc}</option>`;
            });
        });
}

// 2. Sự kiện chọn Dropdown gợi ý
document.getElementById('select-giai-dau').addEventListener('change', function() {
    const rawVal = this.value;
    
    if (!rawVal || rawVal === "-1") {
        document.getElementById('ten_giai').value = '';
        document.getElementById('don_vi_to_chuc').value = '';
        document.getElementById('ten_san').value = '';
        document.getElementById('ngay_khai_mac').value = '';
        document.getElementById('ngay_be_mac').value = '';
        document.getElementById('doi_vo_dich').value = '';
        document.getElementById('vua_pha_luoi').value = '';
        return;
    }

    const giaiId = parseInt(rawVal);
    const item = danhSachGiaiDaKy.find(g => g.id === giaiId);
    if (item) {
        document.getElementById('ten_giai').value = item.ten_giai || '';
        document.getElementById('don_vi_to_chuc').value = item.don_vi_to_chuc || '';
        document.getElementById('ten_san').value = item.ten_san || 'Sân Bóng FC';
        document.getElementById('ngay_khai_mac').value = item.ngay_khai_mac || '';
        document.getElementById('ngay_be_mac').value = item.ngay_be_mac || '';
    }
});

// 3. XEM TRƯỚC ẢNH & XỬ LÝ NÚT XÓA TỪNG ẢNH
document.getElementById('input-files-anh').addEventListener('change', function(e) {
    const files = Array.from(this.files);
    if (files.length === 0) return;

    fileListToUpload = fileListToUpload.concat(files);
    capNhatBadgeVaRenderAnh();
    this.value = ''; // Reset input để có thể chọn lại cùng 1 file nếu cần
});

// Hàm vẽ danh sách ảnh preview có nút "X" màu đỏ ở góc
function renderPreviewAnh() {
    const preview = document.getElementById('preview-anh-upload');
    preview.innerHTML = '';
    
    fileListToUpload.forEach((file, index) => {
        const blobUrl = URL.createObjectURL(file);
        
        preview.innerHTML += `
            <div style="position: relative; display: inline-block; margin-right: 10px; margin-bottom: 8px;">
                <img src="${blobUrl}" title="Ảnh ${index + 1}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 2px solid #ff9800; display: block;">
                <button type="button" onclick="xoaAnhKhoiFileList(${index})" title="Bỏ chọn ảnh này" 
                    style="position: absolute; top: -6px; right: -6px; background: #ff5722; color: white; border: 2px solid white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3); padding: 0;">
                    ✕
                </button>
            </div>
        `;
    });
}

// Hàm xóa 1 file ảnh khỏi mảng khi bấm nút "X"
window.xoaAnhKhoiFileList = function(index) {
    fileListToUpload.splice(index, 1);
    capNhatBadgeVaRenderAnh();
};

function capNhatBadgeVaRenderAnh() {
    const badge = document.getElementById('badge-count-anh');
    if (fileListToUpload.length > 0) {
        badge.style.display = 'inline-block';
        badge.innerText = `+${fileListToUpload.length} ảnh`;
    } else {
        badge.style.display = 'none';
    }
    renderPreviewAnh();
}

// 4. BẤM NÚT LƯU BẢNG VÀNG
document.getElementById('btn-luu-vinh-danh').onclick = async function(e) {
    e.preventDefault();
    
    const selectVal = document.getElementById('select-giai-dau').value;
    const giaiId = (selectVal && selectVal !== "-1") ? parseInt(selectVal) : 0;
    
    const tenGiai = document.getElementById('ten_giai').value.trim();
    const donViToChuc = document.getElementById('don_vi_to_chuc').value.trim();
    const tenSan = document.getElementById('ten_san').value.trim();
    const ngayKhaiMac = document.getElementById('ngay_khai_mac').value;
    const ngayBeMac = document.getElementById('ngay_be_mac').value;
    const doiVoDich = document.getElementById('doi_vo_dich').value.trim();
    const doiAQuan = document.getElementById('doi_a_quan').value.trim();
    const vuaPhaLuoi = document.getElementById('vua_pha_luoi').value.trim();
    const ghiChu = document.getElementById('ghi_chu').value.trim();

    // KIỂM TRA ĐẦY ĐỦ THÔNG TIN
    if (!tenGiai || !donViToChuc) { alert("Vui lòng nhập Tên giải và Đơn vị tổ chức!"); return; }
    if (!ngayKhaiMac || !ngayBeMac) { alert("Vui lòng chọn Ngày khai mạc và Bế mạc!"); return; }
    if (ngayBeMac < ngayKhaiMac) { alert("⚠️ ❌ LỖI: Ngày bế mạc không thể nhỏ hơn Ngày khai mạc!"); return; }
    if (!doiVoDich || !vuaPhaLuoi) { alert("Vui lòng nhập Đội vô địch và Vua phá lưới!"); return; }
    if (fileListToUpload.length === 0) { alert("Vui lòng chọn ít nhất 1 ảnh vinh danh!"); return; }

    // STEP A: UPLOAD CÁC FILE ẢNH LÊN BACKEND MỘT LẦN DUY NHẤT
    const imageFormData = new FormData();
    fileListToUpload.forEach(file => imageFormData.append('files', file));

    try {
        const resUpload = await fetch('http://127.0.0.1:5000/api/pitch/upload-tournament-images', {
            method: 'POST',
            body: imageFormData
        });
        const uploadResult = await resUpload.json();

        if (uploadResult.status !== 'success') {
            alert("Lỗi upload ảnh lên hệ thống!");
            return;
        }

        const danhSachDuongDanAnh = uploadResult.images.join(',');

        // STEP B: LƯU THÔNG TIN VÀO DATABASE
        const formData = new FormData();
        if (giaiId > 0) formData.append('giai_id', giaiId);
        formData.append('ten_giai', tenGiai);
        formData.append('don_vi_to_chuc', donViToChuc);
        formData.append('ten_san', tenSan || "Sân Bóng FC");
        formData.append('ngay_khai_mac', ngayKhaiMac);
        formData.append('ngay_be_mac', ngayBeMac);
        formData.append('doi_vo_dich', doiVoDich);
        formData.append('doi_a_quan', doiAQuan);
        formData.append('vua_pha_luoi', vuaPhaLuoi);
        formData.append('ghi_chu', ghiChu);
        formData.append('danh_sach_anh', danhSachDuongDanAnh);

        const resSave = await fetch('http://127.0.0.1:5000/api/pitch/update-vinh-danh', {
            method: 'POST',
            body: formData
        });
        const saveResult = await resSave.json();

        alert(saveResult.message || "🎉 Đã cập nhật Bảng Vàng thành công!");

        // RESET FORM SẠCH SẼ
        document.getElementById('select-giai-dau').value = '';
        document.getElementById('ten_giai').value = '';
        document.getElementById('don_vi_to_chuc').value = '';
        document.getElementById('ten_san').value = '';
        document.getElementById('ngay_khai_mac').value = '';
        document.getElementById('ngay_be_mac').value = '';
        document.getElementById('doi_vo_dich').value = '';
        document.getElementById('doi_a_quan').value = '';
        document.getElementById('vua_pha_luoi').value = '';
        document.getElementById('ghi_chu').value = '';
        document.getElementById('preview-anh-upload').innerHTML = '';
        document.getElementById('badge-count-anh').style.display = 'none';
        fileListToUpload = [];

        loadDanhSachGiaiToSelect();
        loadDanhSachVinhDanhTable();

    } catch (err) {
        console.error("Lỗi:", err);
        alert("Lỗi kết nối máy chủ!");
    }
};

// 5. Tải danh sách bài vinh danh
function loadDanhSachVinhDanhTable() {
    fetch('http://127.0.0.1:5000/api/pitch/get-vinh-danh')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('tbody-vinh-danh');
            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Chưa có bài vinh danh nào.</td></tr>';
                return;
            }
            data.forEach(item => {
                const countAnh = item.anh_vinh_danh ? item.anh_vinh_danh.split(',').length : 0;
                tbody.innerHTML += `
                    <tr>
                        <td>#${item.id}</td>
                        <td><b>${item.ten_giai}</b></td>
                        <td>${item.ten_san}</td>
                        <td>🥇 ${item.doi_vo_dich}</td>
                        <td>⚽ ${item.vua_pha_luoi}</td>
                        <td>🖼️ ${countAnh} ảnh</td>
                        <td>
                            <button class="btn-delete" onclick="xoaVinhDanh(${item.id})">🗑️ Xóa</button>
                        </td>
                    </tr>
                `;
            });
        });
}

window.xoaVinhDanh = function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bài vinh danh này khỏi Bảng Vàng?")) return;
    fetch(`http://127.0.0.1:5000/api/pitch/delete-vinh-danh/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadDanhSachGiaiToSelect();
            loadDanhSachVinhDanhTable();
        });
};