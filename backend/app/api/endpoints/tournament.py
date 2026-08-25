
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import GiaiDau
from app.schemas.tournament_schema import TournamentCreate

router = APIRouter()

# API 1: Lấy danh sách lịch sử tất cả các giải đấu đã diễn ra[cite: 6]
@router.get("/get-tournaments")
def lay_lich_su_giai_dau(db: Session = Depends(get_db)):
    # Lấy toàn bộ lịch sử giải đấu xếp theo ngày tổng kết mới nhất lên đầu[cite: 6]
    danh_sach_giai = db.query(GiaiDau).order_by(GiaiDau.ngay_be_mac.desc()).all()
    return danh_sach_giai

# API 2: Lưu thông tin tổng kết giải đấu mới (Form của chủ sân)[cite: 6]
@router.post("/add-tournament", status_code=status.HTTP_201_CREATED)
def luu_tong_ket_giai(request: TournamentCreate, db: Session = Depends(get_db)):
    # Tạo bản ghi mới dựa trên dữ liệu gửi lên[cite: 6]
    giai_moi = GiaiDau(
        ten_giai=request.ten_giai,
        don_vi_to_chuc=request.don_vi_to_chuc,
        so_doi=request.so_doi,
        vo_dich=request.vo_dich,
        a_quan=request.a_quan,
        anh_giai_dau=request.anh_giai_dau,
        ngay_khoi_tranh=request.ngay_khoi_tranh,
        ngay_be_mac=request.ngay_be_mac
    )
    
    db.add(giai_moi)
    db.commit()
    
    return {"status": "success", "message": f"Đã lưu lịch sử giải đấu {request.ten_giai} vào bảng vàng!"}