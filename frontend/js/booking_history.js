const phienUser = localStorage.getItem('user');
const phienToken = localStorage.getItem('token');

if (!phienUser) {
    alert("Vui lòng đăng nhập để xem lịch sử!"); window.location.href = 'login.html';
}
const user = JSON.parse(phienUser);

let nutAdmin = (user.vai_tro === 'Admin' || user.vai_tro === 'admin') 
    ? `<a href="admin_dashboard.html" style="background: #ff9800; color: black; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-right: 15px;">⚙️ Vào Quản Trị</a>` : '';

document.getElementById('vung-tai-khoan').innerHTML = `
    ${nutAdmin} 
    <span style="margin-right: 15px; font-weight: bold; color: #17b978;">👋 Chào, ${user.ten}</span>
    <a href="#" id="nut-dang-xuat" style="color: #ff5722; text-decoration: none; font-size: 14px; font-weight: bold;">[Đăng xuất]</a>
`;

document.getElementById('nut-dang-xuat').addEventListener('click', function(e) {
    e.preventDefault(); localStorage.removeItem('user'); localStorage.removeItem('token'); window.location.href = 'index.html';
});

// Tải danh sách ngân hàng Việt Nam chính thức từ VietQR
let danhSachNganHangVN = [];
fetch('https://api.vietqr.io/v2/banks')
    .then(res => res.json())
    .then(data => { if(data.code === "00") danhSachNganHangVN = data.data; });

window.huyCaDa = async function(donId) {
    let xacNhan = confirm("⚠️ QUY ĐỊNH HỦY CA:\n- Hủy trước 24h: Được hoàn 50% tiền cọc.\n- Hủy sát giờ (< 24h): KHÔNG ĐƯỢC HỦY.\n\nBạn có muốn tiếp tục gửi yêu cầu?");
    if (!xacNhan) return;

    // 1. Nhập và kiểm tra tên Ngân hàng
    let nganHangNhap = prompt("Nhập Tên hoặc Viết tắt Ngân hàng nhận 50% cọc (Ví dụ: MBBank, VCB, VPBank, Techcombank...):");
    if (!nganHangNhap) return;

    let nganHangChuan = null;
    let inputClean = nganHangNhap.trim().toLowerCase().replace(/\s+/g, '');

    // Thuật toán dò tìm tên ngân hàng thông minh
    if (danhSachNganHangVN.length > 0) {
        nganHangChuan = danhSachNganHangVN.find(b => 
            b.shortName.toLowerCase().replace(/\s+/g, '') === inputClean ||
            b.code.toLowerCase() === inputClean ||
            b.name.toLowerCase().includes(inputClean)
        );
    }

    if (!nganHangChuan) {
        alert(`❌ Ngân hàng "${nganHangNhap}" KHÔNG TỒN TẠI hoặc sai tên!\nVui lòng nhập đúng mã tên ngân hàng (Ví dụ: MBBank, Vietcombank, ACB, BIDV...).`);
        return; // Dừng ngay lập tức nếu nhập tên ngân hàng linh tinh
    }

    // 2. Nhập STK và Tên chủ TK
    let stk = prompt(`Ngân hàng đã chọn: [${nganHangChuan.shortName}]\nNhập Số tài khoản nhận tiền hoàn:`);
    if (!stk) return;

    let chuTk = prompt("Nhập Tên chủ tài khoản (VIẾT HOA KHÔNG DẤU):");
    if (!chuTk) return;

    // 3. Gửi thông tin chính xác về Backend
    // SỬA LẠI ĐOẠN GỬI FETCH TRONG HÀM huyCaDa (booking_history.js):
fetch(`http://127.0.0.1:5000/api/booking/cancel-request/${donId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        // Gửi tên trường kiểu 1 (ngắn)
        ngan_hang: nganHangChuan.shortName,
        stk: stk.trim(),
        chu_tk: chuTk.trim().toUpperCase(),

        // Gửi kèm tên trường kiểu 2 (đầy đủ) để khớp tuyệt đối với Backend
        ngan_hang_hoan_tien: nganHangChuan.shortName,
        stk_hoan_tien: stk.trim(),
        chu_tk_hoan_tien: chuTk.trim().toUpperCase()
    })
})
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            taiLichSu();
        } else {
            // Hiện cảnh báo chặn nếu sát giờ đá (< 24h)
            alert(data.detail || data.message || "Lỗi xử lý!");
        }
    })
    .catch(err => {
        console.error("Lỗi kết nối:", err);
        alert("Không thể kết nối máy chủ Backend!");
    });
}
let xemHetKhachLe = false;
let xemHetKhachGiai = false;

function taiLichSu() {
    fetch(`http://127.0.0.1:5000/api/booking/user-history/${user.id}`)
        .then(res => res.json())
        .then(data => {
            // 1. XỬ LÝ BẢNG ĐƠN LẺ
            const tbodyLe = document.getElementById('lich-su-le');
            tbodyLe.innerHTML = '';
            const donLeList = data.don_le || [];

            if(donLeList.length === 0) {
                tbodyLe.innerHTML = '<tr><td colspan="7" style="color:#999; text-align:center;">Bạn chưa đặt trận lẻ nào.</td></tr>';
                catNhatNutXem('box-nut-khach-le', 0, false);
            } else {
                const listHienThi = xemHetKhachLe ? donLeList : donLeList.slice(0, 5);

                listHienThi.forEach(don => {
                    let stClass = 'st-trang', stText = 'Chưa cọc';
                    if (don.trang_thai === 'Dang_Xet') { stClass = 'st-vang'; stText = '⏳ Đang kiểm tra cọc'; }
                    else if (don.trang_thai === 'Da_Coc') { stClass = 'st-xanh'; stText = '✅ Đã xác nhận cọc'; }
                    else if (don.trang_thai === 'Yeu_Cau_Huy') { stClass = 'st-cam'; stText = '💸 Đang chờ hoàn tiền'; }
                    else if (don.trang_thai === 'Sai_STK') { stClass = 'st-cam'; stText = '⚠️ Sai STK Hoàn'; }
                    else if (don.trang_thai === 'Da_Huy') { stClass = 'st-huy'; stText = '❌ Đã Hủy'; }

                    const now = new Date();
                    const gioDa = new Date(`${don.ngay_da}T${don.gio_bat_dau}`);
                    const timeDiffGiay = (gioDa - now) / 1000;

                    let btnHuy = '';
                    if (don.trang_thai === 'Da_Huy') {
                        btnHuy = `<button class="btn-huy" disabled style="background:#ccc; cursor:not-allowed;">Đã Hủy</button>`;
                    } else if (don.trang_thai === 'Yeu_Cau_Huy') {
                        btnHuy = `<button class="btn-huy" disabled style="background:#ff9800; color:white; border:none;">⏳ Đang Chờ Hoàn Tiền</button>`;
                    } else if (don.trang_thai === 'Sai_STK') {
                        btnHuy = `<button class="btn-huy" onclick="huyCaDa(${don.id})" style="background:#e91e63; color:white;">✏️ Sửa STK Hoàn</button>`;
                    } else if (don.trang_thai !== 'Da_Coc') {
                        btnHuy = `<button class="btn-huy" disabled style="background:#eee; color:#aaa; cursor:not-allowed;">Chưa Cọc</button>`;
                    } else if (timeDiffGiay < 86400) { 
                        btnHuy = `<button class="btn-huy" disabled style="background:#ccc; cursor:not-allowed;">Quá Hạn (>24h)</button>`;
                    } else {
                        btnHuy = `<button class="btn-huy" onclick="huyCaDa(${don.id})">🗑️ Yêu Cầu Hủy</button>`;
                    }

                    tbodyLe.innerHTML += `
                        <tr>
                            <td><b>#${don.id}</b></td>
                            <td>${don.ten_san}</td>
                            <td>${don.ngay_da}</td>
                            <td style="color:#17b978; font-weight:bold;">${don.gio_bat_dau} - ${don.gio_ket_thuc}</td>
                            <td style="color:#ff5722; font-weight:bold;">${don.tong_tien ? don.tong_tien.toLocaleString() : 0}đ</td>
                            <td><span class="status ${stClass}">${stText}</span></td>
                            <td>${btnHuy}</td>
                        </tr>
                    `;
                });

                catNhatNutXem('box-nut-khach-le', donLeList.length, xemHetKhachLe, () => {
                    xemHetKhachLe = !xemHetKhachLe;
                    taiLichSu();
                });
            }

            // 2. XỬ LÝ BẢNG GIẢI ĐẤU
            const tbodyGiai = document.getElementById('lich-su-giai');
            tbodyGiai.innerHTML = '';
            const donGiaiList = data.don_giai || [];

            if(donGiaiList.length === 0) {
                tbodyGiai.innerHTML = '<tr><td colspan="5" style="color:#999; text-align:center;">Bạn chưa đăng ký giải đấu nào.</td></tr>';
                catNhatNutXem('box-nut-khach-giai', 0, false);
            } else {
                const listGiaiHienThi = xemHetKhachGiai ? donGiaiList : donGiaiList.slice(0, 5);

                listGiaiHienThi.forEach(giai => {
                    let stClass = 'st-trang', stText = '📞 Chờ gọi tư vấn';
                    if (giai.trang_thai === 'Da_Ky_Hop_Dong') { stClass = 'st-xanh'; stText = '🖋️ Đã Ký Hợp Đồng'; }
                    else if (giai.trang_thai === 'Tu_Choi') { stClass = 'st-huy'; stText = '❌ Bị từ chối'; }

                    tbodyGiai.innerHTML += `
                        <tr>
                            <td><b>#G-${giai.id}</b></td>
                            <td style="color:#ff9800; font-weight:bold;">${giai.ten_giai}</td>
                            <td>${giai.ten_san}</td>
                            <td>Từ: ${giai.ngay_khai_mac}<br>Đến: ${giai.ngay_be_mac}</td>
                            <td><span class="status ${stClass}">${stText}</span></td>
                        </tr>
                    `;
                });

                catNhatNutXem('box-nut-khach-giai', donGiaiList.length, xemHetKhachGiai, () => {
                    xemHetKhachGiai = !xemHetKhachGiai;
                    taiLichSu();
                });
            }
        });
}

// Hàm hỗ trợ vẽ nút "Xem thêm / Thu gọn" phía Khách
function catNhatNutXem(boxId, tongSo, dangMo, callbackOnClick) {
    let boxElem = document.getElementById(boxId);
    if (!boxElem) return;

    if (tongSo <= 5) { boxElem.innerHTML = ''; return; }

    const textNut = dangMo 
        ? `🔼 Thu gọn (Đang hiện ${tongSo} ca)` 
        : `🔽 Xem tất cả ${tongSo} ca đá (Còn ${tongSo - 5} ca nữa)`;

    boxElem.innerHTML = `
        <button type="button" class="btn-xem-them-khach" style="background:#17b978; color:white; border:none; padding:7px 16px; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer; transition:0.2s;">
            ${textNut}
        </button>
    `;

    boxElem.querySelector('.btn-xem-them-khach').onclick = callbackOnClick;
}
taiLichSu();