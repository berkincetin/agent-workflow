from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime


class UserBase(BaseModel):
    """Kullanıcı temel bilgileri."""

    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    """Kullanıcı oluşturma için model."""

    password: str


class UserInDB(UserBase):
    """Veritabanında saklanan kullanıcı modeli."""

    id: str
    password: str
    created_at: datetime


class UserResponse(UserBase):
    """Kullanıcı yanıt modeli."""

    id: str


class Token(BaseModel):
    """Yetkilendirme token'ı."""

    access_token: str
    token_type: str


class Node(BaseModel):
    """İş akışı düğümü."""

    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]


class Edge(BaseModel):
    """İş akışı düğümleri arasındaki bağlantı."""

    id: str
    source: str
    target: str
    type: str = "default"


class WorkflowBase(BaseModel):
    """İş akışı temel modeli."""

    name: str
    description: Optional[str] = None
    nodes: List[Node]
    edges: List[Edge]
    id: Optional[str] = None


class Agent(BaseModel):
    """Ajan modeli."""

    name: str
    description: Optional[str] = None
    prompt: str


class WorkflowExecutionResult(BaseModel):
    """İş akışı yürütme sonucu."""

    workflow_id: str
    results: List[Dict[str, Any]]
    execution_time: float
    status: str


class WorkflowExecuteRequest(BaseModel):
    """İş akışı yürütme isteği."""

    input_text: str = ""
