document.getElementById('form-login').addEventListener('submit', function(e) {
    e.preventDefault();
    const errMsg = document.getElementById('err-msg');
    const btn = document.querySelector('.btn-login');
    
    btn.disabled = true;
    btn.innerText = "Đang kiểm tra...";
    
    const data = {
        so_dien_thoai: document.getElementById('so_dien_thoai').value,
        mat_khau: document.getElementById('mat_khau').value
    };

    fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json().then(result => ({ status: res.status, body: result })))
    .then(resObj => {
        if (resObj.status === 200) {
            localStorage.setItem('user', JSON.stringify(resObj.body.user));
            localStorage.setItem('token', resObj.body.token); 
            
            const vaiTro = resObj.body.user.vai_tro;
            
            if (vaiTro === 'Admin' || vaiTro === 'admin') {
                alert("👨‍💼 Chào mừng Sếp tổng (Chủ sân) quay trở lại làm việc!");
                window.location.href = 'admin_dashboard.html';
            } else {
                alert("🎉 Đăng nhập thành công!");
                window.location.href = 'index.html'; 
            }
        } else {
            errMsg.style.display = 'block';
            errMsg.innerText = resObj.body.message;
            btn.disabled = false;
            btn.innerText = "Đăng Nhập";
        }
    })
    .catch(err => {
        errMsg.style.display = 'block';
        errMsg.innerText = "Lỗi kết nối Server Backend!";
        btn.disabled = false;
        btn.innerText = "Đăng Nhập";
    });
});