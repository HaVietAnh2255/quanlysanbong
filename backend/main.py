# ==============================================================================
# MAIN.PY - FILE KHỞI CHẠY CHÍNH CỦA BACKEND FASTAPI
# ==============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import các thành phần kết nối Database và Router API
from app.core.database import engine, Base
from app.api.router import api_router

# 1. TỰ ĐỘNG TẠO TẤT CẢ CÁC BẢNG TRONG DATABASE (NẾU CHƯA CÓ)
# Lệnh này sẽ quét toàn bộ Models trong app/models/models.py và vẽ bảng tự động
Base.metadata.create_all(bind=engine)

# 2. KHỞI TẠO ỨNG DỤNG FASTAPI
app = FastAPI(
    title="API Quản Lý Sân Bóng - FastAPI",
    description="Hệ thống Backend chuẩn Clean Architecture chuyển đổi từ Flask sang FastAPI",
    version="1.0.0",
    docs_url="/docs",      # Trình xem tài liệu Swagger UI tại http://127.0.0.1:5000/docs
    redoc_url="/redoc"     # Trình xem tài liệu ReDoc bổ sung
)

# 3. CẤU HÌNH BẢO MẬT CORS (FIX TRIỆT ĐỂ LỖI CHẶN TRUY CẬP TỪ GO LIVE / PORT 5500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Cho phép tất cả các nguồn gửi request (Bao gồm http://127.0.0.1:5500)
    allow_credentials=True,    # Cho phép gửi kèm cookie / token xác thực
    allow_methods=["*"],       # Mở tất cả phương thức HTTP: GET, POST, PUT, DELETE, PATCH, OPTIONS
    allow_headers=["*"],       # Cho phép tất cả các loại Headers (Ví dụ: Content-Type, Authorization)
)

# 4. ĐĂNG KÝ TẤT CẢ ROUTER VÀO ỨNG DỤNG VỚI TIỀN TỐ /api
# Cấu trúc gọi sẽ là: /api/auth, /api/pitch, /api/booking, /api/tournament
app.include_router(api_router, prefix="/api")

# 5. API TRANG CHỦ KIỂM TRA SỨC KHỎE SERVER (HEALTH CHECK)
@app.get("/", tags=["Health Check"])
def trang_chu():
    return {
        "status": "success",
        "message": "🎉 Server Backend FastAPI Quản Lý Sân Bóng đã khởi chạy thành công rực rỡ!"
    }

# 6. ĐIỂM KHỞI CHẠY SERVER KHI CHẠY TRỰC TIẾP FILE main.py
if __name__ == "__main__":
    # Chạy server ở host 0.0.0.0, port 5000, bật tự động reload khi sửa code
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)