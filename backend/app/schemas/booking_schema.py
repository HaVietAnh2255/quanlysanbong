# app/schemas/booking_schema.py
from pydantic import BaseModel
# app/schemas/booking_schema.py


from datetime import date, time
from typing import List, Optional, Union, Any

# Schema cho từng ca đá đơn lẻ
class CaDaItem(BaseModel):
    bat_dau: time
    ket_thuc: time
    tien: float

# Schema gửi yêu cầu đặt sân
class DatLichCreate(BaseModel):
    user_id: int
    san_id: int
    ngay_da: date
    loai_dat: Optional[str] = "Don_Le"   # 👈 Sửa giá trị mặc định thành "Don_Le" (hoặc "Khach_Le")
    ghi_chu: Optional[str] = None        # 👈 BỔ SUNG THÊM DÒNG NÀY để nhận chuỗi JSON thông tin Giải Đấu
    danh_sach_ca: List[CaDaItem]         # (Giữ nguyên dòng này của sếp)

# Schema yêu cầu hủy lịch
class HuyLichRequest(BaseModel):
    ngan_hang: str
    stk: str
    chu_tk: str

# Schema đăng ký giải đấu
class DatGiaiDauCreate(BaseModel):
    user_id: int
    san_id: int
    ten_giai: str
    don_vi_to_chuc: str
    so_doi: int
    ngay_khai_mac: date
    ngay_be_mac: date
    yeu_cau_them: Optional[str] = None
    lich_du_kien: Optional[str] = None
    lich_du_kien: Any

class UpdateStatusRequest(BaseModel):
    don_id: Union[int, str]  # Chấp nhận cả ID là 12 hoặc chuỗi "12-13-14"
    trang_thai: str
# Schema Admin cập nhật trạng thái hợp đồng giải đấu [CÁI THIẾU BỊ BÁO LỖI NÀY SẾP ÔI]
class UpdateTournamentStatusRequest(BaseModel):
    giai_id: int
    trang_thai: str
    gia_thoa_thuan: Optional[float] = 0