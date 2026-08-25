
from pydantic import BaseModel
from typing import List, Optional
from datetime import time

class KhungGioGiaBase(BaseModel):
    tu: time
    den: time
    gia: float

class PitchCreate(BaseModel):
    ten_san: str
    dia_chi: str
    anh_san: Optional[str] = "./images/default_pitch.jpg"
    mo_ta: Optional[str] = "Sân cỏ nhân tạo đạt chuẩn, có nước uống, áo pitch free."
    danh_sach_anh: Optional[str] = ""
    gia_mac_dinh: Optional[int] = 300000
    khung_gia: List[KhungGioGiaBase]  # 👈 Dùng đúng tên KhungGioGiaBase ở trên nè sếp!

# 3. Class Toggle Bảo Trì
class ToggleMaintenanceRequest(BaseModel):
    san_id: int
    trang_thai: str

# 4. Class Cấu Hình Hệ Thống
class ConfigSystemRequest(BaseModel):
    fb_link: Optional[str] = ""
    zalo_link: Optional[str] = ""
    hotline: Optional[str] = ""