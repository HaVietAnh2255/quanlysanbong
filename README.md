
#  Hệ Thống Quản Lý & Đặt Sân Bóng Đá

Hệ thống đặt sân bóng đá trực tuyến kết hợp quản lý giải đấu và hoàn tiền tự động qua VietQR, xây dựng theo kiến trúc phân tầng chuẩn RESTful API.

---

## Công Nghệ Sử Dụng 

* **Backend:** FastAPI (Python), SQLAlchemy ORM, Pydantic, PostgreSQL (`psycopg2`).
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
* **Xác thực & Bảo mật:** JWT (JSON Web Token), Bcrypt Password Hashing, CORS Middleware.
* **Tích hợp:** Quản lý lịch thi đấu, upload ảnh đa phương tiện, sinh mã thanh toán VietQR.

---
(Project Structure)

```text
quanlysanbong/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/    # Xử lý logic API (pitch, booking, auth...)
│   │   ├── core/             # Cấu hình Database & Security
│   │   ├── models/           # SQLAlchemy ORM Models (PostgreSQL tables)
│   │   └── schemas/          # Pydantic Schemas (Data validation)
│   ├── main.py               # File khởi chạy ứng dụng & gộp Router
│   └── requirements.txt      # Danh sách thư viện Backend
├── frontend/
│   ├── css/                  # Giao diện người dùng & Admin
│   ├── js/                   # Logic gọi API từ trình duyệt
│   ├── images/               # Thư mục chứa tài nguyên ảnh
│   └── *.html                # Các trang giao diện (Đặt sân, Admin, Lịch...)
├── .gitignore
├── .env.example
└── README.md
 Hướng Dẫn Cài Đặt & Chạy Dự Án 
1. Yêu Cầu Tiên Quyết
Python >= 3.10

PostgreSQL đã được cài đặt và tạo sẵn database.

2. Cài Đặt Backend
Mở Terminal tại thư mục backend/:

Bash
cd backend

# Tạo và kích hoạt môi trường ảo
python -m venv venv
# Trên Windows:
venv\Scripts\activate
# Trên Linux/Mac:
source venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt
3. Cấu Hình Biến Môi Trường
Tạo file .env bên trong thư mục backend/ theo mẫu từ .env.example:

Đoạn mã
DATABASE_URL=postgresql://postgres:mat_khau_cua_ban@localhost:5432/quanlysanbong
4. Khởi Chạy Server
Tại thư mục backend/, chạy lệnh:

Bash
uvicorn main:app --reload --port 5000
Backend API Base URL: [http://127.0.0.1:5000](http://127.0.0.1:5000)

Swagger UI (Tài liệu API tương tác): [http://127.0.0.1:5000/docs](http://127.0.0.1:5000/docs)

5. Chạy Giao Diện (Frontend)
Mở trực tiếp các file HTML trong thư mục frontend/ (ví dụ: index.html, booking.html) bằng trình duyệt hoặc sử dụng extension Live Server trên VS Code.

Các Tính Năng Chính
Khách hàng: Xem danh sách sân, kiểm tra khung giờ trống theo ngày, đặt sân lẻ, đăng ký tổ chức giải đấu, yêu cầu hủy đơn và hoàn cọc.

Quản trị viên (Admin): Quản lý sân bóng (thêm/sửa/xóa mềm), cập nhật bảng giá linh hoạt theo khung giờ, duyệt đơn giải đấu, cập nhật Bảng Vàng vinh danh giải đấu và xử lý hoàn tiền VietQR, xem doanh thu theo ngày, tuần, ,tháng, năm của các sân.