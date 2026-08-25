
from pydantic import BaseModel
from typing import Optional
from datetime import date

# Form dùng cho lúc Chủ sân lưu tổng kết giải đấu lên Bảng vàng
class TournamentCreate(BaseModel):
    ten_giai: str
    don_vi_to_chuc: Optional[str] = None
    so_doi: Optional[int] = 0
    vo_dich: Optional[str] = None
    a_quan: Optional[str] = None
    anh_giai_dau: Optional[str] = "/images/default_giai.jpg"
    ngay_khoi_tranh: Optional[date] = None
    ngay_be_mac: Optional[date] = None