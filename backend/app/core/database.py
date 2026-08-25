# app/core/database.py
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Đọc cấu hình từ file .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Khởi tạo Engine kết nối (kết nối đồng bộ bằng psycopg2 như cũ cho ổn định)
engine = create_engine(DATABASE_URL)

# Tạo Session để các API mượn dùng mỗi khi cần truy vấn
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Cấu trúc gốc để các bảng kế thừa
Base = declarative_base()

# Hàm để tiêm (Dependency Injection) Session vào các API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()