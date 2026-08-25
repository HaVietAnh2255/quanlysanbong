
from pydantic import BaseModel
from typing import Optional

# Form dùng cho lúc khách Đăng Ký
class UserCreate(BaseModel):
    ten: str
    so_dien_thoai: str
    email: Optional[str] = None
    mat_khau: str
    vai_tro: Optional[str] = "Khach_Hang"

# Form dùng cho lúc khách Đăng Nhập
class UserLogin(BaseModel):
    so_dien_thoai: str
    mat_khau: str