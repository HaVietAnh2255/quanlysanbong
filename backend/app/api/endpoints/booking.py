# app/api/endpoints/booking.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from datetime import datetime
import jwt
import json

from app.core.database import get_db
from app.core.security import SECRET_KEY
from app.models.models import DatLich, SanBong, YeuCauGiaiDau, User
from app.schemas.booking_schema import (
    DatLichCreate, 
    HuyLichRequest, 
    DatGiaiDauCreate, 
    UpdateStatusRequest,
    UpdateTournamentStatusRequest
)

router = APIRouter()

# ==============================================================================
# 1. API ĐẶT LỊCH LẺ (CÓ 3 LỚP GIÁP BẢO VỆ & LOCK CONCURRENCY)
# ==============================================================================
@router.post("/book", status_code=status.HTTP_201_CREATED)
def dat_lich(request: DatLichCreate, db: Session = Depends(get_db)):
    if not request.danh_sach_ca:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 khung giờ!")

    # LỚP GIÁP 1: Chặn thời gian quá khứ và giới hạn 7 ngày
    today = datetime.now().date()
    if request.ngay_da < today:
        raise HTTPException(status_code=400, detail="Không thể đặt lịch quay ngược về quá khứ!")
        
    if (request.ngay_da - today).days > 7 and request.loai_dat == 'Khach_Le':
        raise HTTPException(status_code=400, detail="Nhằm chống spam, khách lẻ chỉ được phép đặt trước tối đa 7 ngày!")

    # LỚP GIÁP 2: Khóa Concurrency
    san = db.query(SanBong).filter(SanBong.id == request.san_id).with_for_update().first()
    if not san:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân bóng!")

    # LỚP GIÁP 3: Kiểm tra Overlap trùng giờ
    for ca in request.danh_sach_ca:
        overlap = db.query(DatLich).filter(
            DatLich.san_id == request.san_id,
            DatLich.ngay_da == request.ngay_da,
            DatLich.trang_thai.in_(['Da_Coc', 'Dang_Xet']),
            DatLich.gio_bat_dau < ca.ket_thuc,
            DatLich.gio_ket_thuc > ca.bat_dau
        ).first()
        if overlap:
            raise HTTPException(status_code=400, detail=f"Rất tiếc! Ca {ca.bat_dau.strftime('%H:%M')} - {ca.ket_thuc.strftime('%H:%M')} vừa bị người khác nẫng tay trên. Sếp chọn giờ khác nhé!")

    # XỬ LÝ LÕI: Tách đơn
    danh_sach_id_moi = []
    tong_tien_toan_bo = 0
    
    for ca in request.danh_sach_ca:
        don_moi = DatLich(
            user_id=request.user_id,
            san_id=request.san_id,
            ngay_da=request.ngay_da,
            gio_bat_dau=ca.bat_dau,
            gio_ket_thuc=ca.ket_thuc,
            tong_tien=ca.tien,
            loai_dat=request.loai_dat,
            ghi_chu=request.ghi_chu,
            trang_thai="Chua_Coc"
        )
        db.add(don_moi)
        db.flush() # Flush lấy ID trước
        danh_sach_id_moi.append(str(don_moi.id))
        tong_tien_toan_bo += ca.tien
        
    db.commit()
    don_id_dai_dien = "-".join(danh_sach_id_moi)
    
    return {"message": "Tạo đơn thành công!", "don_id": don_id_dai_dien, "tong_tien": tong_tien_toan_bo}


# ==============================================================================
# 2. API LẤY KHUNG GIỜ LÊN LƯỚI BẢNG GIỜ (ĐÃ FIX LỖI ĐỎ TOÀN TẬP)
# ==============================================================================
@router.get("/get-slots")
def lay_khung_gio_da_dat(san_id: int, ngay_da: str, db: Session = Depends(get_db)):
    ngay_da_obj = datetime.strptime(ngay_da, '%Y-%m-%d').date()
    
    # ĐÃ XÓA LOGIC QUÉT GIẢI ĐẤU KHÓA FULL NGÀY Ở ĐÂY.
    # Giải đấu không thể chiếm dụng sân 24/24. Chủ sân sẽ chủ động block 
    # các khung giờ thi đấu thực tế (VD: 15h-17h T7, CN) thông qua hệ thống đặt lịch.

    # Chỉ quét đơn lẻ để khóa giờ
    cac_lich = db.query(DatLich).filter(
        DatLich.san_id == san_id,
        DatLich.ngay_da == ngay_da_obj,
        DatLich.trang_thai != 'Da_Huy'
    ).all()
    
    danh_sach_gio = [{
        "bat_dau": lich.gio_bat_dau.strftime('%H:%M'),
        "ket_thuc": lich.gio_ket_thuc.strftime('%H:%M'),
        "loai": "Le",
        "trang_thai": lich.trang_thai
    } for lich in cac_lich]

    return danh_sach_gio

# ==============================================================================
# 3. API LẤY TẤT CẢ ĐƠN LẺ (CHO ADMIN DASHBOARD) - FIX LỖI ATTRIBUTE
# ==============================================================================
@router.get("/all-bookings")
def lay_toan_bo_don_le(db: Session = Depends(get_db)):
    don_hangs = db.query(DatLich).order_by(DatLich.id.desc()).all()
    
    ket_qua = []
    for don in don_hangs:
        user_info = db.query(User).filter(User.id == don.user_id).first()
        san_info = db.query(SanBong).filter(SanBong.id == don.san_id).first()
        
        ten_khach = "Khách vãng lai"
        sdt_khach = ""
        if user_info:
            ten_khach = getattr(user_info, 'ten', None) or getattr(user_info, 'ho_ten', 'Khách hàng')
            sdt_khach = getattr(user_info, 'so_dien_thoai', '') or ''

        # 👈 FIX LỖI +1 NGÀY: Lấy đúng định dạng YYYY-MM-DD thuần chuỗi
        ngay_da_str = str(don.ngay_da).split(' ')[0] if don.ngay_da else ""

        ket_qua.append({
            "id": don.id,
            "user_id": don.user_id,
            "san_id": don.san_id,
            "ten_san": san_info.ten_san if san_info else "N/A",
            "ten_khach": ten_khach,
            "so_dien_thoai": sdt_khach,
            "ngay_da": ngay_da_str,
            "gio_bat_dau": str(don.gio_bat_dau)[:5],
            "gio_ket_thuc": str(don.gio_ket_thuc)[:5],
            "tong_tien": getattr(don, 'tong_tien', 0) or 0,
            "tien_coc": getattr(don, 'tien_coc', 0) or 0,
            "trang_thai": don.trang_thai or "Chua_Coc",
            "loai_dat": getattr(don, 'loai_dat', 'Don_Le') or 'Don_Le', 
            "ghi_chu": getattr(don, 'ghi_chu', '') or '',
            
            "stk_hoan_tien": getattr(don, 'stk_hoan_tien', '') or '',
            "chu_tk_hoan_tien": getattr(don, 'chu_tk_hoan_tien', '') or '',
            "ngan_hang_hoan_tien": getattr(don, 'ngan_hang_hoan_tien', '') or ''
        })
        
    return ket_qua

# ==============================================================================
# 4. API LẤY TẤT CẢ YÊU CẦU GIẢI ĐẤU (CHO ADMIN DASHBOARD) - BỔ SUNG EMAIL
# ==============================================================================
@router.get("/all-tournaments")
def lay_toan_bo_don_giai(db: Session = Depends(get_db)):
    danh_sach = db.query(YeuCauGiaiDau).order_by(YeuCauGiaiDau.id.desc()).all()
    
    ket_qua = []
    for g in danh_sach:
        user_info = db.query(User).filter(User.id == g.user_id).first()
        san_info = db.query(SanBong).filter(SanBong.id == g.san_id).first()
        
        # Lấy thông tin tài khoản người đại diện
        ten_khach = "N/A"
        sdt_khach = "Chưa cập nhật"
        email_khach = ""
        
        if user_info:
            ten_khach = getattr(user_info, 'ten', None) or getattr(user_info, 'ho_ten', 'Khách hàng')
            sdt_khach = getattr(user_info, 'so_dien_thoai', '') or "Chưa cập nhật"
            email_khach = getattr(user_info, 'email', '') or ""

        ket_qua.append({
            "id": g.id,
            "ten_khach": ten_khach,
            "so_dien_thoai": sdt_khach,
            "email": email_khach,  # 🎯 Trả Email về cho Frontend
            "ten_giai": g.ten_giai,
            "don_vi_to_chuc": g.don_vi_to_chuc,
            "so_doi": g.so_doi,
            "ten_san": san_info.ten_san if san_info else "N/A",
            "ngay_khai_mac": g.ngay_khai_mac.strftime('%Y-%m-%d') if g.ngay_khai_mac else "",
            "ngay_be_mac": g.ngay_be_mac.strftime('%Y-%m-%d') if g.ngay_be_mac else "",
            "yeu_cau_them": g.yeu_cau_them or "",
            "lich_du_kien": getattr(g, 'lich_du_kien', '') or "",
            "trang_thai": g.trang_thai
        })
    return ket_qua

# ==============================================================================
# 5. API LẤY LỊCH SỬ ĐẶT SÂN CỦA KHÁCH HÀNG - FIX LỖI ATTRIBUTE
# ==============================================================================
# ==============================================================================
# 5. API LẤY LỊCH SỬ ĐẶT SÂN CỦA KHÁCH HÀNG - FIX LẪN LỘN CA GIẢI ĐẤU 0Đ
# ==============================================================================
@router.get("/user-history/{user_id}")
def lay_lich_su_user(user_id: int, db: Session = Depends(get_db)):
    # 🎯 CHỈ LẤY ĐƠN ĐÁ LẺ THỰC SỰ (LOẠI BỎ CÁC CA THI ĐẤU CỦA GIẢI ĐẤU)
    don_les = db.query(DatLich).filter(
        DatLich.user_id == user_id,
        DatLich.loai_dat != 'Giai_Dau'
    ).order_by(DatLich.id.desc()).all()
    
    don_giaiss = db.query(YeuCauGiaiDau).filter(YeuCauGiaiDau.user_id == user_id).order_by(YeuCauGiaiDau.id.desc()).all()
                   
    list_don_le = []
    for d in don_les:
        san_info = db.query(SanBong).filter(SanBong.id == d.san_id).first()
        list_don_le.append({
            "id": d.id,
            "ten_san": san_info.ten_san if san_info else "Sân đã xóa",
            "ngay_da": d.ngay_da.strftime('%Y-%m-%d'),
            "gio_bat_dau": d.gio_bat_dau.strftime('%H:%M'),
            "gio_ket_thuc": d.gio_ket_thuc.strftime('%H:%M'),
            "tong_tien": d.tong_tien,
            "trang_thai": d.trang_thai
        })

    list_don_giai = []
    for g in don_giaiss:
        san_info = db.query(SanBong).filter(SanBong.id == g.san_id).first()
        list_don_giai.append({
            "id": g.id,
            "ten_giai": g.ten_giai,
            "ten_san": san_info.ten_san if san_info else "Sân đã xóa",
            "ngay_khai_mac": g.ngay_khai_mac.strftime('%Y-%m-%d') if g.ngay_khai_mac else "",
            "ngay_be_mac": g.ngay_be_mac.strftime('%Y-%m-%d') if g.ngay_be_mac else "",
            "trang_thai": g.trang_thai
        })

    return {
        "don_le": list_don_le,
        "don_giai": list_don_giai
    }

# ==============================================================================
# 6. API ADMIN DUYỆT CỌC / TỪ CHỐI ĐƠN LẺ - [THÊM MỚI FIX LỖI 404]
# ==============================================================================
@router.post("/update-status")
def cap_nhat_trang_thai_don(req: UpdateStatusRequest, db: Session = Depends(get_db)):
    # Đơn có thể là danh sách chuỗi ID ghép lại như "12-13-14" hoặc số lẻ 12
    str_id = str(req.don_id)
    str_ids = str_id.split("-")
    
    for sid in str_ids:
        sid_clean = sid.strip()
        if sid_clean.isdigit():
            don = db.query(DatLich).filter(DatLich.id == int(sid_clean)).first()
            if don:
                don.trang_thai = req.trang_thai
                
    db.commit()
    return {"status": "success", "message": "🎉 Đã cập nhật trạng thái đơn hàng thành công!"}

# ==============================================================================
# 7. API ADMIN DUYỆT HỢP ĐỒNG GIẢI ĐẤU - [THÊM MỚI FIX LỖI 404]
# ==============================================================================
# ==============================================================================
# 7. API ADMIN DUYỆT HỢP ĐỒNG GIẢI ĐẤU - [ĐÃ TỰ ĐỘNG TÁCH CA CON CHUẨN KHÁCH HÀNG]
# ==============================================================================
@router.post("/update-tournament-status")
def cap_nhat_trang_thai_giai(req: UpdateTournamentStatusRequest, db: Session = Depends(get_db)):
    import json

    giai = db.query(YeuCauGiaiDau).filter(YeuCauGiaiDau.id == req.giai_id).first()
    if not giai:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin giải đấu này!")
    
    # 1. Cập nhật trạng thái Yêu cầu giải
    giai.trang_thai = req.trang_thai
    if req.gia_thoa_thuan:
        giai.gia_thoa_thuan = req.gia_thoa_thuan

    # 2. Nếu Admin duyệt chốt hợp đồng (Da_Ky_Hop_Dong hoặc Da_Xac_Nhan) -> Tách ca con
    if req.trang_thai in ['Da_Ky_Hop_Dong', 'Da_Xac_Nhan', 'Da_Coc']:
        
        # Lấy thông tin khách hàng sở hữu giải
        khach_hang = db.query(User).filter(User.id == giai.user_id).first()
        ten_khach = khach_hang.ten if khach_hang else "Đơn vị Giải Đấu"
        sdt_khach = khach_hang.so_dien_thoai if khach_hang else ""

        # Đóng gói thông tin Hợp đồng & Đơn vị vào JSON ghi chú
        thong_tin_ghi_chu = json.dumps({
            "ten_giai": giai.ten_giai,
            "don_vi": giai.don_vi_to_chuc or "Ban Tổ Chức",
            "hop_dong": req.gia_thoa_thuan or 0,
            "ten_khach": ten_khach,
            "so_dien_thoai": sdt_khach
        }, ensure_ascii=False)

        # Giải mã danh sách ca đá dự kiến
        lich_list = []
        if giai.lich_du_kien:
            try:
                lich_list = json.loads(giai.lich_du_kien) if isinstance(giai.lich_du_kien, str) else giai.lich_du_kien
            except Exception:
                lich_list = []

        # Tự động tạo các ca con trong bảng DatLich
        for ca in lich_list:
            san_id = ca.get("san_id") or giai.san_id
            ngay_da = ca.get("ngay_da")
            gio_bd = ca.get("gio_bat_dau")
            gio_kt = ca.get("gio_ket_thuc")

            if ngay_da and gio_bd and gio_kt:
                # Kiểm tra tránh tạo trùng ca con nếu đã bấm duyệt trước đó
                da_co = db.query(DatLich).filter(
                    DatLich.san_id == san_id,
                    DatLich.ngay_da == ngay_da,
                    DatLich.gio_bat_dau == gio_bd,
                    DatLich.loai_dat == 'Giai_Dau'
                ).first()

                if not da_co:
                    don_con = DatLich(
                        user_id=giai.user_id,             # 👈 GIỮ NGUYÊN user_id KHÁCH HÀNG (Không bị gán tên Admin)
                        san_id=san_id,
                        ngay_da=ngay_da,
                        gio_bat_dau=gio_bd,
                        gio_ket_thuc=gio_kt,
                        tong_tien=0,                     # Tiền đã nằm trong Hợp đồng giải
                        trang_thai="Da_Coc",              # Đã chốt giữ lịch
                        loai_dat="Giai_Dau",              # Nhãn Giải Đấu
                        ghi_chu=thong_tin_ghi_chu         # Lưu thông tin Giải + Khách + Hợp Đồng
                    )
                    db.add(don_con)

    db.commit()
    return {"status": "success", "message": "🎉 Đã cập nhật trạng thái giải đấu và chốt lịch thành công!"}
# ==============================================================================
# 8. API KHÁCH ĐĂNG KÝ TỔ CHỨC GIẢI ĐẤU - [THÊM MỚI BỔ SUNG]
# ==============================================================================
# ==============================================================================
# 8. API KHÁCH ĐĂNG KÝ TỔ CHỨC GIẢI ĐẤU (ĐÃ FIX LỖI 422 & OVERLAP)
# ==============================================================================
@router.post("/book-tournament", status_code=status.HTTP_201_CREATED)
def dang_ky_giai_dau(req: DatGiaiDauCreate, db: Session = Depends(get_db)):
    
    # 1. Bóc tách danh sách các ca đá dự kiến an toàn
    danh_sach_ca = []
    if req.lich_du_kien:
        if isinstance(req.lich_du_kien, list):
            danh_sach_ca = req.lich_du_kien
        elif isinstance(req.lich_du_kien, str):
            try:
                danh_sach_ca = json.loads(req.lich_du_kien)
            except Exception:
                danh_sach_ca = []

    # 2. Check trùng lịch từng ca
    for ca in danh_sach_ca:
        if isinstance(ca, dict):
            san_id_ca = ca.get("san_id") or req.san_id
            ngay_da_ca = ca.get("ngay_da")
            gio_bd_ca = ca.get("gio_bat_dau")
            gio_kt_ca = ca.get("gio_ket_thuc")

            if ngay_da_ca and gio_bd_ca and gio_kt_ca:
                ca_trung = db.query(DatLich).filter(
                    DatLich.san_id == san_id_ca,
                    DatLich.ngay_da == ngay_da_ca,
                    DatLich.trang_thai.in_(["Da_Coc", "Da_Thanh_Toan"]),
                    DatLich.gio_bat_dau < gio_kt_ca,
                    DatLich.gio_ket_thuc > gio_bd_ca
                ).first()

                if ca_trung:
                    san_obj = db.query(SanBong).filter(SanBong.id == san_id_ca).first()
                    ten_san = san_obj.ten_san if san_obj else f"Sân #{san_id_ca}"
                    
                    raise HTTPException(
                        status_code=400, 
                        detail=f"❌ Khung giờ {gio_bd_ca} - {gio_kt_ca} ngày {ngay_da_ca} tại {ten_san} đã có lịch đặt ({str(ca_trung.gio_bat_dau)[:5]} - {str(ca_trung.gio_ket_thuc)[:5]}). Vui lòng chọn khung giờ khác!"
                    )

    # 3. Chuyển lich_du_kien về dạng chuỗi JSON để lưu Database
    str_lich_save = json.dumps(req.lich_du_kien, ensure_ascii=False) if isinstance(req.lich_du_kien, (list, dict)) else str(req.lich_du_kien or '')

    giai_moi = YeuCauGiaiDau(
        user_id=req.user_id,
        san_id=req.san_id,
        ten_giai=req.ten_giai,
        don_vi_to_chuc=req.don_vi_to_chuc,
        so_doi=req.so_doi,
        ngay_khai_mac=req.ngay_khai_mac,
        ngay_be_mac=req.ngay_be_mac,
        yeu_cau_them=req.yeu_cau_them or "",
        lich_du_kien=str_lich_save,
        trang_thai='Cho_Tu_Van'
    )
    db.add(giai_moi)
    db.commit()
    return {"status": "success", "message": "Đã gửi yêu cầu tổ chức giải thành công!"}
# ==============================================================================
# ==============================================================================
# API KHÁCH YÊU CẦU HỦY CA ĐÁ (CHECK 24H & LƯU TÀI KHOẢN NGÂN HÀNG)
# ==============================================================================
@router.patch("/cancel-request/{don_id}")
def yeu_cau_huy_ca(don_id: int, request: HuyLichRequest, db: Session = Depends(get_db)):
    don = db.query(DatLich).filter(DatLich.id == don_id).first()
    if not don:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã đơn này trên hệ thống!")
        
    if don.trang_thai in ['Da_Huy', 'Yeu_Cau_Huy']:
        raise HTTPException(status_code=400, detail="Đơn này đã gửi yêu cầu hủy hoặc đã hủy xong rồi!")

    # 1. TÍNH TOÁN THỜI GIAN THỰC TỚI GIỜ ĐÁ
    thoi_gian_da = datetime.combine(don.ngay_da, don.gio_bat_dau)
    thoi_gian_hien_tai = datetime.now()
    thoi_gian_con_lai_giay = (thoi_gian_da - thoi_gian_hien_tai).total_seconds()

    # 2. KIỂM TRA ĐIỀU KIỆN 24 TIẾNG (24h * 3600s = 86,400 giây)
    if thoi_gian_con_lai_giay < 86400:
        raise HTTPException(
            status_code=400, 
            detail="⚠️ RẤT XIN LỖI SẾP! Ca đá này còn dưới 24 tiếng nữa là diễn ra. Theo quy định sân bóng, ca đá sát giờ KHÔNG ĐƯỢC PHÉP HỦY VÀ HOÀN CỌC!"
        )

    # 3. LƯU THÔNG TIN NGÂN HÀNG DO KHÁCH NHẬP VÀO DATABASE
    don.trang_thai = 'Yeu_Cau_Huy'
    don.stk_hoan_tien = request.stk
    don.chu_tk_hoan_tien = request.chu_tk
    don.ngan_hang_hoan_tien = request.ngan_hang
    
    db.commit()
    return {
        "status": "success", 
        "message": "🎉 Đã gửi yêu cầu hủy ca thành công! Thông tin tài khoản ngân hàng của bạn đã được chuyển tới Admin để bắn lại 50% tiền cọc."
    }
# =========================================================
# API CHECK TRÙNG LỊCH THỜI GIAN THỰC (DÙNG CHO FRONTEND BÁO ĐỎ)
# =========================================================
@router.post("/check-overlap")
def check_trung_khung_gio(data: dict, db: Session = Depends(get_db)):
    san_id = data.get("san_id")
    ngay_da = data.get("ngay_da")
    gio_bd = data.get("gio_bat_dau")
    gio_kt = data.get("gio_ket_thuc")

    if not all([san_id, ngay_da, gio_bd, gio_kt]):
        return {"is_trung": False, "message": "Thiếu thông tin kiểm tra"}

    trung_don = db.query(DatLich).filter(
        DatLich.san_id == san_id,
        DatLich.ngay_da == ngay_da,
        DatLich.trang_thai.in_(["Da_Coc", "Da_Thanh_Toan"]),
        DatLich.gio_bat_dau < gio_kt,
        DatLich.gio_ket_thuc > gio_bd
    ).first()

    if trung_don:
        san_info = db.query(SanBong).filter(SanBong.id == san_id).first()
        ten_san = san_info.ten_san if san_info else f"Sân #{san_id}"
        
        # 👈 ÉP KIỂU str() AN TOÀN TRƯỚC KHI CẮT CHUỖI [:5] (FIX CẢ LỖI 500 VÀ LỖI CORS)
        str_bd = str(trung_don.gio_bat_dau)[:5]
        str_kt = str(trung_don.gio_ket_thuc)[:5]

        return {
            "is_trung": True,
            "message": f"❌ Trùng lịch {ten_san} ngày {ngay_da} (Đã có ca: {str_bd} - {str_kt})"
        }

    return {"is_trung": False, "message": "OK"}