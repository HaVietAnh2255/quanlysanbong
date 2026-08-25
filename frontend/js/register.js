document.getElementById('form-register').addEventListener('submit', function(e) {
    e.preventDefault();
    const thongBao = document.getElementById('thong-bao');
    const btn = document.querySelector('.btn-register');
    
    btn.disabled = true;
    btn.innerText = "Đang xử lý...";
    
    const data = {
        ten: document.getElementById('ten').value,
        so_dien_thoai: document.getElementById('so_dien_thoai').value,
        email: document.getElementById('email').value,
        mat_khau: document.getElementById('mat_khau').value,
        vai_tro: 'khach' 
    };

    fetch('http://127.0.0.1:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json().then(result => ({ status: res.status, body: result })))
    .then(resObj => {
        thongBao.style.display = 'block';
        if (resObj.status === 201) {
            thongBao.style.background = '#d4edda';
            thongBao.style.color = '#155724';
            thongBao.innerText = resObj.body.message + " Đang chuyển hướng...";
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            thongBao.style.background = '#f8d7da';
            thongBao.style.color = '#721c24';
            thongBao.innerText = "Lỗi: " + resObj.body.message;
            btn.disabled = false;
            btn.innerText = "Đăng Ký Ngay";
        }
    })
    .catch(err => {
        thongBao.style.display = 'block';
        thongBao.style.background = '#f8d7da';
        thongBao.style.color = '#721c24';
        thongBao.innerText = "Lỗi kết nối tới Server Backend!";
        btn.disabled = false;
        btn.innerText = "Đăng Ký Ngay";
    });
});