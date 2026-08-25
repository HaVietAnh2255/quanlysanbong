// =========================================================
// SỰ KIỆN TỰ ĐỘNG CẬP NHẬT CHUÔNG THÔNG BÁO CHO MỌI TRANG ADMIN
// =========================================================

function capNhatChuongToanHeThong() {
    let tongThongBao = 0;

    Promise.all([
        // 1. Tải danh sách đơn lẻ
        fetch('http://127.0.0.1:5000/api/booking/all-bookings').then(r => r.ok ? r.json() : []).catch(() => []),
        // 2. Tải danh sách yêu cầu giải đấu
        fetch('http://127.0.0.1:5000/api/booking/all-tournaments').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([listDonLe, listDonGiai]) => {
        
        // Đếm đơn lẻ cần duyệt (Đang_Xet hoặc Yeu_Cau_Huy)
        listDonLe.forEach(don => {
            if (don.trang_thai === 'Dang_Xet' || don.trang_thai === 'Yeu_Cau_Huy') {
                tongThongBao++;
            }
        });

        // Đếm đơn giải đấu cần duyệt (Cho_Tu_Van hoặc Cho_Duyet)
        listDonGiai.forEach(giai => {
            if (giai.trang_thai === 'Cho_Tu_Van' || giai.trang_thai === 'Cho_Duyet') {
                tongThongBao++;
            }
        });

        // Cập nhật số liệu hiển thị lên icon Chuông
        const badgeElem = document.getElementById('so-thong-bao');
        if (badgeElem) {
            if (tongThongBao > 0) {
                badgeElem.style.display = 'inline-block';
                badgeElem.innerText = tongThongBao;
            } else {
                badgeElem.style.display = 'none';
            }
        }
    }).catch(err => console.error("Lỗi cập nhật quả chuông:", err));
}

// Chạy hàm ngay khi trang web vừa tải xong
document.addEventListener("DOMContentLoaded", () => {
    capNhatChuongToanHeThong();
    
    // Tự động quét cập nhật lại số trên chuông mỗi 15 giây (Real-time nhẹ)
    setInterval(capNhatChuongToanHeThong, 15000);
});