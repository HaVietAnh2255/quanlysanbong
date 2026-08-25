const phienDangNhap = localStorage.getItem('user');
if (phienDangNhap) {
    const userHienTai = JSON.parse(phienDangNhap);
    let nutAdmin = (userHienTai.vai_tro === 'Admin' || userHienTai.vai_tro === 'admin') 
        ? `<a href="admin_dashboard.html" style="background: #ff9800; color: black; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-right: 15px;">⚙️ Vào Quản Trị</a>` : '';

    document.getElementById('vung-tai-khoan').innerHTML = `
        ${nutAdmin}
        <span style="margin-right: 15px; font-weight: bold; color: #17b978;">👋 Chào, ${userHienTai.ten}</span>
        <a href="#" id="nut-dang-xuat" style="color: #ff5722; text-decoration: none; font-size: 14px; font-weight: bold;">[Đăng xuất]</a>
    `;
    document.getElementById('nut-dang-xuat').onclick = (e) => { 
        e.preventDefault(); 
        localStorage.removeItem('user'); 
        localStorage.removeItem('token'); 
        window.location.reload(); 
    };
}

let danhSachGiaiVinhDanh = [];
let currentAlbum = [];
let currentImgIndex = 0;

document.addEventListener("DOMContentLoaded", function() {
    loadVinhDanhData();

    // SỰ KIỆN TÌM KIẾM THEO THỜI GIAN THỰC
    const inputSearch = document.getElementById('input-search-giai');
    if (inputSearch) {
        inputSearch.addEventListener('input', function() {
            const keyword = this.value.trim().toLowerCase();
            const ketQuaLoc = danhSachGiaiVinhDanh.filter(item => 
                item.ten_giai.toLowerCase().includes(keyword) || 
                item.don_vi_to_chuc.toLowerCase().includes(keyword)
            );
            renderCardList(ketQuaLoc);
        });
    }
});

function loadVinhDanhData() {
    fetch('http://127.0.0.1:5000/api/pitch/get-vinh-danh')
        .then(res => res.json())
        .then(data => {
            danhSachGiaiVinhDanh = data;
            renderCardList(data);
        })
        .catch(err => {
            console.error("Lỗi lấy dữ liệu vinh danh:", err);
            document.getElementById('danh-sach-vinh-danh').innerHTML = '<p class="loading">Không kết nối được máy chủ!</p>';
        });
}

function renderCardList(list) {
    const grid = document.getElementById('danh-sach-vinh-danh');
    grid.innerHTML = '';
    if (!list || list.length === 0) {
        grid.innerHTML = '<p class="loading">Chưa có giải đấu nào phù hợp với tìm kiếm.</p>';
        return;
    }
    list.forEach((item, index) => {
        const listAnh = item.anh_vinh_danh ? item.anh_vinh_danh.split(',') : ['./images/san1.jpg'];
        const avatar = listAnh[0];
        grid.innerHTML += `
            <div class="card-vinh-danh">
                <!-- NHẤP VÀO ẢNH: MỞ ALBUM -->
                <div class="card-img-wrap" onclick="moAlbumModal(${index})" title="Nhấp để xem Album ảnh">
                    <img src="${avatar}" alt="${item.ten_giai}">
                </div>
                <!-- NHẤP VÀO THÔNG TIN CHỮ: MỞ POPUP CHI TIẾT & LỜI CẢM THÁN -->
                <div class="card-body-clickable" onclick="moModalChiTiet(${index})" title="Nhấp vào đây để xem chi tiết & lời cảm thán">
                    <div class="card-title">🏆 ${item.ten_giai}</div>
                    <div class="card-info"><b>📅 Khai mạc:</b> ${item.ngay_khai_mac}</div>
                    <div class="card-info"><b>🏢 Đơn vị:</b> ${item.don_vi_to_chuc}</div>
                    <div class="vinh-danh-badge">
                        🥇 <b>Vô Địch:</b> ${item.doi_vo_dich}<br>
                        🥈 <b>Á Quân:</b> ${item.doi_a_quan}
                    </div>
                    <div class="album-hint" style="color: #1e3d59; font-weight: bold; margin-top: 8px;">ℹ️ Xem chi tiết & lời cảm thán ➔</div>
                </div>
            </div>
        `;
    });
}

// 1. MỞ MODAL ALBUM ẢNH
window.moAlbumModal = function(index) {
    const item = danhSachGiaiVinhDanh[index];
    currentAlbum = item.anh_vinh_danh ? item.anh_vinh_danh.split(',') : ['./images/san1.jpg'];
    currentImgIndex = 0;

    const modal = document.getElementById('modal-album');
    if (modal) {
        modal.style.display = 'flex';
        updateModalImg(item.ten_giai);
    }
};

function updateModalImg(tenGiai) {
    const imgEl = document.getElementById('modal-img-current');
    const capEl = document.getElementById('modal-caption');
    if (imgEl) imgEl.src = currentAlbum[currentImgIndex];
    if (capEl) capEl.innerText = `${tenGiai} - Ảnh (${currentImgIndex + 1}/${currentAlbum.length})`;
}

// 2. MỞ MODAL POPUP CHI TIẾT KÈM LỜI CẢM THÁN
window.moModalChiTiet = function(index) {
    const item = danhSachGiaiVinhDanh[index];
    document.getElementById('ct-ten-giai').innerText = `🏆 ${item.ten_giai}`;
    document.getElementById('ct-don-vi').innerText = item.don_vi_to_chuc;
    document.getElementById('ct-san').innerText = item.ten_san;
    document.getElementById('ct-khai-mac').innerText = item.ngay_khai_mac;
    document.getElementById('ct-be-mac').innerText = item.ngay_be_mac;
    document.getElementById('ct-vo-dich').innerText = item.doi_vo_dich;
    document.getElementById('ct-a-quan').innerText = item.doi_a_quan;
    document.getElementById('ct-pha-luoi').innerText = item.vua_pha_luoi;
    document.getElementById('ct-ghi-chu').innerText = item.ghi_chu;

    const modalCT = document.getElementById('modal-chitiet');
    if (modalCT) modalCT.style.display = 'flex';
};

// ĐÓNG CÁC POPUP MODAL
const closeAlbum = document.querySelector('.close-modal');
if (closeAlbum) {
    closeAlbum.onclick = () => { document.getElementById('modal-album').style.display = 'none'; };
}

const closeChiTiet = document.querySelector('.close-chitiet');
if (closeChiTiet) {
    closeChiTiet.onclick = () => { document.getElementById('modal-chitiet').style.display = 'none'; };
}

const prevBtn = document.getElementById('prev-img');
if (prevBtn) {
    prevBtn.onclick = () => {
        if (currentImgIndex > 0) { 
            currentImgIndex--; 
            updateModalImg(''); 
        }
    };
}

const nextBtn = document.getElementById('next-img');
if (nextBtn) {
    nextBtn.onclick = () => {
        if (currentImgIndex < currentAlbum.length - 1) { 
            currentImgIndex++; 
            updateModalImg(''); 
        }
    };
}