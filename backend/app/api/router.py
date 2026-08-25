
from fastapi import APIRouter
from app.api.endpoints import auth, pitch, booking
# Vài bữa bác làm file tournament xong thì import nó vào đây nhé, tạm thời em comment lại
from app.api.endpoints import tournament 

api_router = APIRouter()

# Gom các luồng vào và gắn nhãn (tags) để cái Swagger UI (Tài liệu API) hiển thị cho đẹp
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(pitch.router, prefix="/pitch", tags=["Pitch Management"])
api_router.include_router(booking.router, prefix="/booking", tags=["Booking"])

api_router.include_router(tournament.router, prefix="/tournament", tags=["Tournament"])