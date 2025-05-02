from typing import Dict, Optional
import os
from src.utils import logger

from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

# Şifre işleme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# JWT kimlik doğrulama
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "gizli_anahtar_burada")
ALGORITHM = "HS256"


def get_password_hash(password: str) -> str:
    """Kullanıcı şifresini hashler."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kullanıcı şifresini doğrular."""
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(email: str, db: Dict) -> Optional[Dict]:
    """Email adresine göre kullanıcı bulur."""
    for user in db["users"]:
        if user["email"] == email:
            return user
    return None


def authenticate_user(email: str, password: str, db: Dict) -> Optional[Dict]:
    """Kullanıcı kimliğini doğrular."""
    user = get_user_by_email(email, db)
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    return user


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT token oluşturur."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str, db: Dict) -> Dict:
    """Token'dan kullanıcı bilgilerini getirir."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz kimlik bilgileri",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(email, db)
    if user is None:
        raise credentials_exception

    logger.info(f"Kullanıcı kimliği doğrulandı: {email}")
    return user
