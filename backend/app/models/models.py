# app/models/models.py
from sqlalchemy import Column, Integer, String, Boolean, Date, Time, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    ten = Column(String, nullable=False)
    so_dien_thoai = Column(String, unique=True, index=True, nullable=False)
    email = Column(String)
    mat_khau = Column(String, nullable=False)
    vai_tro = Column(String, default="Khach_Hang")

class SanBong(Base):
    __tablename__ = "san_bong"

    id = Column(Integer, primary_key=True, index=True)
    ten_san = Column(String(255), nullable=False)
    dia_chi = Column(String(255), nullable=True)
    loai_san = Column(String(50), default="Sân 7")
    anh_san = Column(Text, nullable=True)
    trang_thai = Column(String(50), default="Hoat_Dong")
    trang_thai_hoat_dong = Column(Boolean, default=True)

    # 👈 BỔ SUNG NGHAY 2 DÒNG NÀY ĐỂ TRÁNH LỖI 'mo_ta' IS AN INVALID KEYWORD
    mo_ta = Column(Text, nullable=True)
    danh_sach_anh = Column(Text, nullable=True)
    gia_mac_dinh = Column(Integer, default=300000)

    khung_gia = relationship("KhungGioGia", back_populates="san_bong", cascade="all, delete-orphan")
class KhungGioGia(Base):
    __tablename__ = "khung_gio_gia"
    id = Column(Integer, primary_key=True, index=True)
    san_id = Column(Integer, ForeignKey("san_bong.id"))
    gio_bat_dau = Column(Time, nullable=False)
    gio_ket_thuc = Column(Time, nullable=False)
    gia_tien = Column(Float, nullable=False)
    
    
    san_bong = relationship("SanBong", back_populates="khung_gia",overlaps="san")

class DatLich(Base):
    __tablename__ = "dat_lich"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    san_id = Column(Integer, ForeignKey("san_bong.id"))
    ngay_da = Column(Date, nullable=False)
    gio_bat_dau = Column(Time, nullable=False)
    gio_ket_thuc = Column(Time, nullable=False)
    tong_tien = Column(Float, nullable=False)
    loai_dat = Column(String)
    ghi_chu = Column(Text, nullable=True)
    trang_thai = Column(String, default="Chua_Coc")
    
    # Dành cho hoàn tiền
    stk_hoan_tien = Column(String)
    chu_tk_hoan_tien = Column(String)
    ngan_hang_hoan_tien = Column(String)

# Trong file app/models/models.py
class YeuCauGiaiDau(Base):
    __tablename__ = "yeu_cau_giai_dau"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    san_id = Column(Integer, ForeignKey("san_bong.id"))
    ten_giai = Column(String(255), nullable=False)
    don_vi_to_chuc = Column(String(255), nullable=False)
    so_doi = Column(Integer, default=8)
    ngay_khai_mac = Column(Date, nullable=False)
    ngay_be_mac = Column(Date, nullable=False)
    yeu_cau_them = Column(Text, nullable=True)
    lich_du_kien = Column(Text, nullable=True)
    trang_thai = Column(String(50), default="Cho_Tu_Van") # Cho_Tu_Van, Da_Ky_Hop_Dong, Tu_Choi, Da_Kien_Tao_Vinh_Danh
    gia_thoa_thuan = Column(Float, default=0.0)
    
    # DỮ LIỆU BẢNG VÀNG VINH DANH
    doi_vo_dich = Column(String(255), nullable=True)
    vua_pha_luoi = Column(String(255), nullable=True)
    anh_vinh_danh = Column(Text, nullable=True) # Lưu danh sách đường dẫn ảnh ngăn cách bởi dấu phẩy: "img1.jpg,img2.jpg,img3.jpg"
    doi_a_quan = Column(String(255), nullable=True)
    ghi_chu = Column(Text, nullable=True)
    
class GiaiDau(Base):
    __tablename__ = "giai_dau"
    id = Column(Integer, primary_key=True, index=True)
    ten_giai = Column(String, nullable=False)
    don_vi_to_chuc = Column(String)
    so_doi = Column(Integer)
    vo_dich = Column(String)
    a_quan = Column(String)
    anh_giai_dau = Column(String)
    ngay_khoi_tranh = Column(Date)
    ngay_be_mac = Column(Date)

class CauHinhHeThong(Base):
    __tablename__ = "cau_hinh_he_thong"
    id = Column(Integer, primary_key=True, index=True)
    fb_link = Column(String)
    zalo_link = Column(String)
    hotline = Column(String)
