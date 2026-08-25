# app/api/endpoints/pitch.py
import os
import uuid
from typing import Optional, List
from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.models import SanBong, KhungGioGia, CauHinhHeThong, YeuCauGiaiDau, DatLich, User
from app.schemas.pitch_schema import PitchCreate, ToggleMaintenanceRequest, ConfigSystemRequest

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "..", "frontend", "images", "tournaments")
os.makedirs(UPLOAD_DIR, exist_ok=True)

COURT_UPLOAD_DIR = os.path.join(os.getcwd(), "..", "frontend", "images", "courts")
os.makedirs(COURT_UPLOAD_DIR, exist_ok=True)

def format_time_str(time_val):
    if isinstance(time_val, str):
        return time_val[:5]
    elif isinstance(time_val, time):
        return time_val.strftime('%H:%M')
    return "00:00"

# ==============================================================================
# HÀM HỖ TRỢ XÓA FILE ẢNH VẬT LÝ TRÊN Ổ CỨNG TRÁNH TỒN RÁC
# ==============================================================================
def xoa_file_anh_vat_ly(duong_dan_anh: str):
    if not duong_dan_anh:
        return
    # Bỏ qua các ảnh mặc định của hệ thống
    if "default" in duong_dan_anh or "placeholder" in duong_dan_anh:
        return

    try:
        clean_path = duong_dan_anh.lstrip("./").replace("/", os.sep).replace("\\", os.sep)
        full_path = os.path.abspath(os.path.join(os.getcwd(), "..", "frontend", clean_path))

        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            print(f"🗑️ Đã dọn file ảnh vật lý: {full_path}")
    except Exception as e:
        print(f"⚠️ Không thể xóa file {duong_dan_anh}: {str(e)}")


# ==============================================================================
# 1. API CẤU HÌNH THÔNG TIN LIÊN HỆ & MẠNG XÃ HỘI
# ==============================================================================
@router.get("/get-config")
def lay_cau_hinh_he_thong(db: Session = Depends(get_db)):
    config = db.query(CauHinhHeThong).filter(CauHinhHeThong.id == 1).first()
    if not config:
        return {
            "status": "success",
            "data": {"fb_link": "", "zalo_link": "", "hotline": ""}
        }
    return {
        "status": "success",
        "data": {"fb_link": config.fb_link or "", "zalo_link": config.zalo_link or "", "hotline": config.hotline or ""}
    }

@router.post("/admin/save-config")
def luu_cau_hinh_he_thong(request: ConfigSystemRequest, db: Session = Depends(get_db)):
    config = db.query(CauHinhHeThong).filter(CauHinhHeThong.id == 1).first()
    if not config:
        config = CauHinhHeThong(id=1, fb_link=request.fb_link, zalo_link=request.zalo_link, hotline=request.hotline)
        db.add(config)
    else:
        config.fb_link = request.fb_link
        config.zalo_link = request.zalo_link
        config.hotline = request.hotline
    db.commit()
    return {"status": "success", "message": "🎉 Đã lưu thông tin liên hệ hệ thống thành công!"}


# ==============================================================================
# 2. API QUẢN LÝ SÂN BÓNG (CRUD, BẢO TRÌ, XÓA THÔNG MINH BẢO VỆ DOANH THU)
# ==============================================================================
@router.get("/admin/get-courts")
def lay_danh_sach_san_admin(db: Session = Depends(get_db)):
    danh_sach_san = db.query(SanBong).options(joinedload(SanBong.khung_gia)).filter(SanBong.trang_thai_hoat_dong == True).all()
    ket_qua = []
    for san in danh_sach_san:
        khung_gia_format = [
            {"tu": format_time_str(k.gio_bat_dau), "den": format_time_str(k.gio_ket_thuc), "gia": k.gia_tien} 
            for k in san.khung_gia
        ]
        ket_qua.append({
            "id": san.id,
            "ten_san": san.ten_san,
            "dia_chi": san.dia_chi,
            "loai_san": san.loai_san or "Sân 7",
            "anh_san": san.anh_san or "./images/default_pitch.jpg",
            "trang_thai": san.trang_thai,
            "khung_gia": khung_gia_format
        })
    return {"status": "success", "data": ket_qua}

@router.get("/admin/get-court/{san_id}")
def lay_chi_tiet_san(san_id: int, db: Session = Depends(get_db)):
    san = db.query(SanBong).options(joinedload(SanBong.khung_gia)).filter(SanBong.id == san_id).first()
    if not san: raise HTTPException(status_code=404, detail="Không tìm thấy sân!")
    
    khung_gia_format = [
        {"tu": format_time_str(k.gio_bat_dau), "den": format_time_str(k.gio_ket_thuc), "gia": int(k.gia_tien)} 
        for k in san.khung_gia
    ]
    return {
        "status": "success",
        "data": {
            "id": san.id,
            "ten_san": san.ten_san,
            "dia_chi": san.dia_chi or "",
            "anh_san": san.anh_san or "./images/default_pitch.jpg",
            "mo_ta": getattr(san, 'mo_ta', '') or "",
            "danh_sach_anh": getattr(san, 'danh_sach_anh', '') or san.anh_san or "",
            "gia_mac_dinh": getattr(san, 'gia_mac_dinh', 300000) or 300000,
            "trang_thai": san.trang_thai,
            "khung_gia": khung_gia_format
        }
    }

def check_trung_khung_gio(khung_gia_list):
    for i in range(len(khung_gia_list)):
        kg1 = khung_gia_list[i]
        t_tu1 = datetime.strptime(kg1.tu, "%H:%M").time() if isinstance(kg1.tu, str) else kg1.tu
        t_den1 = datetime.strptime(kg1.den, "%H:%M").time() if isinstance(kg1.den, str) else kg1.den
        
        if t_tu1 >= t_den1:
            return f"Khung giờ #{i+1} có giờ bắt đầu phải nhỏ hơn giờ kết thúc!"

        for j in range(i + 1, len(khung_gia_list)):
            kg2 = khung_gia_list[j]
            t_tu2 = datetime.strptime(kg2.tu, "%H:%M").time() if isinstance(kg2.tu, str) else kg2.tu
            t_den2 = datetime.strptime(kg2.den, "%H:%M").time() if isinstance(kg2.den, str) else kg2.den

            max_tu = max(t_tu1, t_tu2)
            min_den = min(t_den1, t_den2)

            if max_tu < min_den:
                return f"Khung giờ #{i+1} ({kg1.tu}-{kg1.den}) bị trùng với Khung giờ #{j+1} ({kg2.tu}-{kg2.den})!"
    return None

@router.post("/admin/toggle-maintenance")
def bat_tat_bao_tri_san(request: ToggleMaintenanceRequest, db: Session = Depends(get_db)):
    san = db.query(SanBong).filter(SanBong.id == request.san_id).first()
    if not san:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân bóng tương ứng!")

    if san.trang_thai == "Bao_Tri":
        san.trang_thai = "Hoat_Dong"
        thong_bao = f"🎉 Sân '{san.ten_san}' đã chuyển sang trạng thái HOẠT ĐỘNG!"
    else:
        san.trang_thai = "Bao_Tri"
        thong_bao = f"🛠️ Sân '{san.ten_san}' đã chuyển sang trạng thái BẢO TRÌ (Trang khách sẽ tự động mờ báo bảo trì)!"

    db.commit()
    return {
        "status": "success",
        "message": thong_bao,
        "trang_thai": san.trang_thai
    }

@router.post("/admin/add-court")
def them_san_moi(request: PitchCreate, db: Session = Depends(get_db)):
    try:
        san_moi = SanBong(
            ten_san=request.ten_san,
            dia_chi=request.dia_chi,
            loai_san="Sân 7",
            anh_san=request.anh_san,
            mo_ta=request.mo_ta,
            danh_sach_anh=request.danh_sach_anh,
            gia_mac_dinh=request.gia_mac_dinh,
            trang_thai="Hoat_Dong",
            trang_thai_hoat_dong=True
        )
        db.add(san_moi)
        db.flush()
        
        for kg in request.khung_gia:
            t_tu = datetime.strptime(kg.tu, "%H:%M").time() if isinstance(kg.tu, str) else kg.tu
            t_den = datetime.strptime(kg.den, "%H:%M").time() if isinstance(kg.den, str) else kg.den
            db.add(KhungGioGia(san_id=san_moi.id, gio_bat_dau=t_tu, gio_ket_thuc=t_den, gia_tien=kg.gia))
            
        db.commit()
        return {"status": "success", "message": "🎉 Thêm sân bóng mới thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi Server: {str(e)}")

# D. Cập nhật sân & XÓA CÁC ẢNH VẬT LÝ BỊ XÓA BỎ
@router.put("/admin/update-court/{san_id}")
def cap_nhat_san(san_id: int, request: PitchCreate, db: Session = Depends(get_db)):
    try:
        san = db.query(SanBong).filter(SanBong.id == san_id).first()
        if not san: raise HTTPException(status_code=404, detail="Không tìm thấy sân!")

        # 🎯 Dọn các file ảnh bị xóa khỏi danh sách
        anh_cu_list = [a.strip() for a in (getattr(san, 'danh_sach_anh', '') or '').split(',') if a.strip()]
        anh_moi_list = [a.strip() for a in (request.danh_sach_anh or '').split(',') if a.strip()]
        
        for img in anh_cu_list:
            if img not in anh_moi_list and img != request.anh_san:
                xoa_file_anh_vat_ly(img)

        san.ten_san = request.ten_san
        san.dia_chi = request.dia_chi
        san.anh_san = request.anh_san
        san.mo_ta = request.mo_ta
        san.danh_sach_anh = request.danh_sach_anh
        san.gia_mac_dinh = request.gia_mac_dinh

        db.query(KhungGioGia).filter(KhungGioGia.san_id == san_id).delete()
        for kg in request.khung_gia:
            t_tu = datetime.strptime(kg.tu, "%H:%M").time() if isinstance(kg.tu, str) else kg.tu
            t_den = datetime.strptime(kg.den, "%H:%M").time() if isinstance(kg.den, str) else kg.den
            db.add(KhungGioGia(san_id=san.id, gio_bat_dau=t_tu, gio_ket_thuc=t_den, gia_tien=kg.gia))

        db.commit()
        return {"status": "success", "message": "✏️ Đã cập nhật thông tin sân bóng thành công!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi Server: {str(e)}")

# F. Xóa sân & DỌN DẸP TOÀN BỘ FILE ẢNH NẾU XÓA VĨNH VIỄN
@router.delete("/admin/delete-court/{san_id}")
def xoa_san_thong_minh(san_id: int, db: Session = Depends(get_db)):
    san = db.query(SanBong).filter(SanBong.id == san_id).first()
    if not san:
        raise HTTPException(status_code=404, detail="Không tìm thấy sân!")

    co_giai_dau = db.query(YeuCauGiaiDau).filter(YeuCauGiaiDau.san_id == san_id).first()

    if co_giai_dau:
        san.trang_thai_hoat_dong = False
        san.trang_thai = "Bao_Tri"
        db.commit()
        return {
            "status": "success", 
            "message": "⚠️ Sân này đã từng phát sinh dữ liệu giải đấu/doanh thu trong quá khứ nên hệ thống đã ẨN SÂN khỏi trang khách để bảo toàn báo cáo!"
        }
    else:
        # 🎯 Xóa sạch toàn bộ file ảnh của sân trên ổ cứng trước khi xóa bản ghi
        anh_xoa_list = [a.strip() for a in (getattr(san, 'danh_sach_anh', '') or '').split(',') if a.strip()]
        if san.anh_san:
            anh_xoa_list.append(san.anh_san)
            
        for img in set(anh_xoa_list):
            xoa_file_anh_vat_ly(img)

        db.query(KhungGioGia).filter(KhungGioGia.san_id == san_id).delete()
        db.delete(san)
        db.commit()
        return {
            "status": "success", 
            "message": "🗑️ Sân chưa có dữ liệu ràng buộc, đã XÓA VĨNH VIỄN và dọn sạch file ảnh thành công!"
        }


# ==============================================================================
# 3. API TRANG KHÁCH LẤY DANH SÁCH SÂN & BẢNG VÀNG
# ==============================================================================
@router.get("/get-pitches")
def lay_danh_sach_san_khach(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1),
    search: Optional[str] = "",
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    query = db.query(SanBong).options(joinedload(SanBong.khung_gia)).filter(
        SanBong.trang_thai_hoat_dong == True
    )
    if search:
        query = query.filter(SanBong.ten_san.ilike(f"%{search}%"))
        
    danh_sach_san = query.offset(offset).limit(limit).all()
    ket_qua = []
    for san in danh_sach_san:
        khung_gia_format = [
            {"tu": format_time_str(k.gio_bat_dau), "den": format_time_str(k.gio_ket_thuc), "gia": k.gia_tien} 
            for k in san.khung_gia
        ]
        
        ket_qua.append({
            "id": san.id,
            "ten_san": san.ten_san,
            "dia_chi": san.dia_chi,
            "loai_san": san.loai_san or "Sân 7",
            "anh_san": san.anh_san or "./images/default_pitch.jpg",
            "mo_ta": getattr(san, 'mo_ta', '') or "Sân cỏ nhân tạo chất lượng cao.",
            "danh_sach_anh": getattr(san, 'danh_sach_anh', '') or san.anh_san or "",
            "trang_thai": san.trang_thai,
            "khung_gia": khung_gia_format,
            "gia_tien_mac_dinh": getattr(san, 'gia_mac_dinh', 300000) or 300000
        })
    return ket_qua

@router.post("/upload-tournament-images")
async def upload_anh_giai_dau(files: List[UploadFile] = File(...)):
    danh_sach_duong_dan = []
    for file in files:
        extension = os.path.splitext(file.filename)[1]
        file_name = f"tournament_{uuid.uuid4().hex[:8]}{extension}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        danh_sach_duong_dan.append(f"./images/tournaments/{file_name}")
    return {"status": "success", "images": danh_sach_duong_dan}

@router.post("/update-vinh-danh")
def cap_nhat_vinh_danh(
    giai_id: Optional[int] = Form(None),
    ten_giai: str = Form(...),
    don_vi_to_chuc: str = Form(...),
    ten_san: str = Form(...),
    ngay_khai_mac: str = Form(...),
    ngay_be_mac: str = Form(...),
    doi_vo_dich: str = Form(...),
    doi_a_quan: str = Form(""),
    vua_pha_luoi: str = Form(...),
    ghi_chu: str = Form(""),
    danh_sach_anh: str = Form(...),
    db: Session = Depends(get_db)
):
    d_khai_mac = datetime.strptime(ngay_khai_mac, '%Y-%m-%d').date()
    d_be_mac = datetime.strptime(ngay_be_mac, '%Y-%m-%d').date()

    if giai_id and giai_id > 0:
        giai = db.query(YeuCauGiaiDau).filter(YeuCauGiaiDau.id == giai_id).first()
        if giai:
            # 🎯 Dọn ảnh giải đấu cũ nếu bị thay thế
            anh_giai_cu = [a.strip() for a in (giai.anh_vinh_danh or '').split(',') if a.strip()]
            anh_giai_moi = [a.strip() for a in (danh_sach_anh or '').split(',') if a.strip()]
            for img in anh_giai_cu:
                if img not in anh_giai_moi:
                    xoa_file_anh_vat_ly(img)

            giai.ten_giai = ten_giai
            giai.don_vi_to_chuc = don_vi_to_chuc
            giai.ngay_khai_mac = d_khai_mac
            giai.ngay_be_mac = d_be_mac
            giai.doi_vo_dich = doi_vo_dich
            giai.doi_a_quan = doi_a_quan
            giai.vua_pha_luoi = vua_pha_luoi
            giai.ghi_chu = ghi_chu
            giai.anh_vinh_danh = danh_sach_anh
            db.commit()
            return {"status": "success", "message": "🎉 Đã cập nhật Bảng Vàng thành công!"}

    san_bong = db.query(SanBong).first()
    san_id_default = san_bong.id if san_bong else 1
    
    giai_moi = YeuCauGiaiDau(
        user_id=1,
        san_id=san_id_default,
        ten_giai=ten_giai,
        don_vi_to_chuc=don_vi_to_chuc,
        so_doi=8,
        ngay_khai_mac=d_khai_mac,
        ngay_be_mac=d_be_mac,
        trang_thai='Da_Ky_Hop_Dong',
        doi_vo_dich=doi_vo_dich,
        doi_a_quan=doi_a_quan,
        vua_pha_luoi=vua_pha_luoi,
        ghi_chu=ghi_chu,
        anh_vinh_danh=danh_sach_anh
    )
    db.add(giai_moi)
    db.commit()
    return {"status": "success", "message": "🎉 Đã thêm giải đấu vinh danh thành công!"}

# Xóa vinh danh & DỌN SẠCH TẤT CẢ ẢNH VINH DANH TRONG THƯ MỤC
@router.delete("/delete-vinh-danh/{giai_id}")
def xoa_vinh_danh(giai_id: int, db: Session = Depends(get_db)):
    giai = db.query(YeuCauGiaiDau).filter(YeuCauGiaiDau.id == giai_id).first()
    if not giai:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài vinh danh!")
    
    # 🎯 Xóa tất cả các file ảnh vinh danh của giải đấu trên ổ cứng
    anh_xoa_list = [a.strip() for a in (giai.anh_vinh_danh or '').split(',') if a.strip()]
    for img in anh_xoa_list:
        xoa_file_anh_vat_ly(img)

    giai.doi_vo_dich = None
    giai.vua_pha_luoi = None
    giai.anh_vinh_danh = None
    db.commit()
    return {"status": "success", "message": "🗑️ Đã xóa bài vinh danh và dọn sạch file ảnh khỏi Bảng Vàng!"}

@router.get("/get-approved-tournaments")
def lay_danh_sach_giai_da_ky(db: Session = Depends(get_db)):
    danh_sach = db.query(YeuCauGiaiDau).filter(
        YeuCauGiaiDau.trang_thai == 'Da_Ky_Hop_Dong',
        (YeuCauGiaiDau.doi_vo_dich == None) | (YeuCauGiaiDau.doi_vo_dich == '')
    ).order_by(YeuCauGiaiDau.id.desc()).all()
    
    ket_qua = []
    for g in danh_sach:
        san_info = db.query(SanBong).filter(SanBong.id == g.san_id).first()
        ket_qua.append({
            "id": g.id,
            "ten_giai": g.ten_giai,
            "don_vi_to_chuc": g.don_vi_to_chuc,
            "ten_san": san_info.ten_san if san_info else "Sân Bóng FC (Trung Tâm)",
            "ngay_khai_mac": g.ngay_khai_mac.strftime('%Y-%m-%d') if g.ngay_khai_mac else "",
            "ngay_be_mac": g.ngay_be_mac.strftime('%Y-%m-%d') if g.ngay_be_mac else ""
        })
    return ket_qua

@router.get("/get-vinh-danh")
def lay_danh_sach_vinh_danh(db: Session = Depends(get_db)):
    danh_sach = db.query(YeuCauGiaiDau).filter(
        YeuCauGiaiDau.trang_thai == 'Da_Ky_Hop_Dong',
        YeuCauGiaiDau.doi_vo_dich.isnot(None)
    ).all()
    ket_qua = []
    for g in danh_sach:
        san_info = db.query(SanBong).filter(SanBong.id == g.san_id).first()
        ket_qua.append({
            "id": g.id,
            "ten_giai": g.ten_giai,
            "don_vi_to_chuc": g.don_vi_to_chuc,
            "ten_san": san_info.ten_san if san_info else "Sân đăng cai",
            "ngay_khai_mac": g.ngay_khai_mac.strftime('%d/%m/%Y') if g.ngay_khai_mac else "",
            "ngay_be_mac": g.ngay_be_mac.strftime('%d/%m/%Y') if g.ngay_be_mac else "",
            "doi_vo_dich": g.doi_vo_dich,
            "doi_a_quan": g.doi_a_quan or "Đang cập nhật",
            "vua_pha_luoi": g.vua_pha_luoi,
            "ghi_chu": g.ghi_chu or "Không có ghi chú thêm từ ban tổ chức.",
            "anh_vinh_danh": g.anh_vinh_danh
        })
    return ket_qua

@router.post("/admin/upload-court-images")
async def upload_anh_san_bong(files: List[UploadFile] = File(...)):
    danh_sach_duong_dan = []
    for file in files:
        extension = os.path.splitext(file.filename)[1]
        file_name = f"court_{uuid.uuid4().hex[:8]}{extension}"
        file_path = os.path.join(COURT_UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        danh_sach_duong_dan.append(f"./images/courts/{file_name}")
        
    return {"status": "success", "images": danh_sach_duong_dan}

# ==============================================================================
# API LẤY LỊCH SỬ DỤNG SÂN BÓNG DẠNG MA TRẬN CHO ADMIN
# ==============================================================================
@router.get("/admin/calendar")
def lay_lich_admin(ngay: str = Query(...), db: Session = Depends(get_db)):
    try:
        try:
            ngay_dt = datetime.strptime(ngay, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ (YYYY-MM-DD)")

        danh_sach_san = db.query(SanBong).filter(SanBong.trang_thai_hoat_dong == True).all()

        danh_sach_dat = db.query(DatLich).filter(
            DatLich.ngay_da == ngay_dt,
            DatLich.trang_thai != 'Da_Huy'
        ).all()

        don_dat_format = []
        for d in danh_sach_dat:
            user_info = None
            if hasattr(d, 'user_id') and d.user_id:
                user_info = db.query(User).filter(User.id == d.user_id).first()

            ten_khach = "Khách vãng lai"
            if user_info:
                ten_khach = getattr(user_info, 'ten', None) or getattr(user_info, 'ho_ten', 'Khách hàng')

            sdt_khach = getattr(user_info, 'so_dien_thoai', 'Chưa cập nhật') if user_info else 'Chưa cập nhật'
            email_khach = getattr(user_info, 'email', 'Chưa cập nhật') if user_info else 'Chưa cập nhật'

            don_dat_format.append({
                "id": d.id,
                "san_id": d.san_id,
                "gio_bat_dau": format_time_str(d.gio_bat_dau),
                "gio_ket_thuc": format_time_str(d.gio_ket_thuc),
                "trang_thai": d.trang_thai,
                "loai_dat": getattr(d, 'loai_dat', 'Don_Le') or 'Don_Le',
                "tong_tien": getattr(d, 'tong_tien', 0) or 0,
                "tien_coc": getattr(d, 'tien_coc', 0) or 0,
                "ghi_chu": getattr(d, 'ghi_chu', '') or '',
                "khach_hang": {
                    "ten": ten_khach,
                    "so_dien_thoai": sdt_khach,
                    "email": email_khach
                }
            })

        san_format = [{"id": s.id, "ten_san": s.ten_san} for s in danh_sach_san]

        return {
            "status": "success",
            "ngay": ngay,
            "danh_sach_san": san_format,
            "danh_sach_dat": don_dat_format
        }
    except Exception as e:
        print("LỖI API CALENDAR:", str(e))
        raise HTTPException(status_code=500, detail=f"Lỗi Server: {str(e)}")