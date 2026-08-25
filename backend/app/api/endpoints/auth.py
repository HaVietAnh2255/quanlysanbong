
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User
from app.schemas.auth_schema import UserCreate, UserLogin

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def dang_ky(user_in: UserCreate, db: Session = Depends(get_db)):
    # Bác thấy không? user_in đã được FastAPI validate chuẩn chỉnh rồi!
    
    # Kiểm tra số điện thoại xem có ông nào dùng chưa
    user_exist = db.query(User).filter(User.so_dien_thoai == user_in.so_dien_thoai).first()
    if user_exist:
        # Nếu có lỗi, quăng exception là nó tự trả về status 400 cho client
        raise HTTPException(status_code=400, detail="Số điện thoại này đã được đăng ký!")
        
    # Băm mật khẩu và lưu database
    hashed_pw = get_password_hash(user_in.mat_khau)
    new_user = User(
        ten=user_in.ten,
        so_dien_thoai=user_in.so_dien_thoai,
        email=user_in.email,
        mat_khau=hashed_pw,
        vai_tro=user_in.vai_tro
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"status": "success", "message": "Đăng ký tài khoản thành công!"}

@router.post("/login")
def dang_nhap(user_in: UserLogin, db: Session = Depends(get_db)):
    # Tìm khách trong DB
    user = db.query(User).filter(User.so_dien_thoai == user_in.so_dien_thoai).first()
    
    # Kiểm tra sai sđt hoặc sai pass
    if not user or not verify_password(user_in.mat_khau, user.mat_khau):
        raise HTTPException(status_code=401, detail="Số điện thoại hoặc mật khẩu không chính xác!")
        
    # Ép Token 7 ngày y như cũ
    token_payload = {
        'user_id': user.id,
        'vai_tro': user.vai_tro
    }
    token = create_access_token(data=token_payload)
    
    return {
        "status": "success",
        "message": "Đăng nhập thành công!",
        "token": token,
        "user": {
            "id": user.id,
            "ten": user.ten,
            "vai_tro": user.vai_tro,
            "email": user.email
        }
    }