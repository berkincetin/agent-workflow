from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import uuid
from datetime import datetime, timedelta
import os

# Modüler yapı için diğer modülleri import et
from src.utils import (
    load_environment,
    initialize_openai_client,
    logger,
)
from src.models import (
    UserCreate,
    UserResponse,
    Token,
    WorkflowBase,
    Agent,
    WorkflowExecutionResult,
    WorkflowExecuteRequest,
)
from src.auth import (
    oauth2_scheme,
    get_password_hash,
    get_user_by_email,
    authenticate_user,
    create_access_token,
)
from src.agents import get_default_agents, process_with_agent
from src.workflow import execute_workflow_pipeline

# Çevresel değişkenler
load_environment()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
openai_client = initialize_openai_client()

# FastAPI uygulaması
app = FastAPI()

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory veritabanı
DB = {"users": [], "workflows": [], "agents": []}

# Başlangıçta örnek ajanları ekle
DB["agents"] = get_default_agents()


# Kimlik doğrulama işlevi
async def get_current_user(token: str = Depends(oauth2_scheme)):
    from src.auth import get_current_user as get_user

    return await get_user(token, DB)


# Kullanıcı ve kimlik doğrulama endpoint'leri
@app.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    """Yeni kullanıcı kaydı oluşturur."""
    # Email benzersizliğini kontrol et
    if get_user_by_email(user.email, DB):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email zaten kayıtlı"
        )

    # Yeni kullanıcı oluştur
    user_id = str(uuid.uuid4())
    user_db = {
        "id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "password": get_password_hash(user.password),
        "created_at": datetime.utcnow(),
    }

    # Veritabanına ekle
    DB["users"].append(user_db)
    logger.info(f"Yeni kullanıcı kaydedildi: {user.email}")

    # Şifre olmadan kullanıcıyı döndür
    return {"id": user_id, "email": user.email, "full_name": user.full_name}


@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Kullanıcı girişi ve token oluşturma."""
    user = authenticate_user(form_data.username, form_data.password, DB)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz email veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=1440)  # 24 saat
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    logger.info(f"Kullanıcı giriş yaptı: {user['email']}")

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Mevcut oturum açmış kullanıcı bilgilerini getirir."""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
    }


# Ajan endpoint'leri
@app.get("/agents")
async def get_agents():
    """Tüm ajanları listeler."""
    return DB["agents"]


@app.post("/agents")
async def create_agent(agent: Agent):
    """Yeni bir ajan oluşturur."""
    agent_id = str(uuid.uuid4())
    new_agent = {
        "id": agent_id,
        "name": agent.name,
        "description": agent.description or "",
        "prompt": agent.prompt,
        "created_at": datetime.utcnow(),
    }

    DB["agents"].append(new_agent)
    logger.info(f"Yeni ajan oluşturuldu: {agent.name}")

    return new_agent


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Belirli bir ajanın detaylarını getirir."""
    for agent in DB["agents"]:
        if agent["id"] == agent_id:
            return agent

    raise HTTPException(status_code=404, detail="Ajan bulunamadı")


@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Bir ajanı siler."""
    for i, agent in enumerate(DB["agents"]):
        if agent["id"] == agent_id:
            del DB["agents"][i]
            logger.info(f"Ajan silindi: {agent['name']}")
            return {"message": "Ajan başarıyla silindi"}

    raise HTTPException(status_code=404, detail="Ajan bulunamadı")


# İş akışı endpoint'leri
@app.post("/workflows")
async def create_workflow(workflow: WorkflowBase):
    """Yeni iş akışı oluşturur veya mevcut iş akışını günceller."""
    if workflow.id:
        # Mevcut workflow'u güncelle
        for i, wf in enumerate(DB["workflows"]):
            if wf["id"] == workflow.id:
                updated_workflow = {
                    "id": workflow.id,
                    "name": workflow.name,
                    "description": workflow.description,
                    "nodes": [node.dict() for node in workflow.nodes],
                    "edges": [edge.dict() for edge in workflow.edges],
                    "user_id": wf.get("user_id", "demo_user"),
                    "created_at": wf["created_at"],
                    "updated_at": datetime.utcnow(),
                }
                DB["workflows"][i] = updated_workflow
                logger.info(f"İş akışı güncellendi: {workflow.name}")
                return updated_workflow

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İş akışı bulunamadı",
        )

    # Yeni workflow oluştur
    workflow_id = str(uuid.uuid4())
    try:
        new_workflow = {
            "id": workflow_id,
            "name": workflow.name,
            "description": workflow.description,
            "nodes": [node.dict() for node in workflow.nodes],
            "edges": [edge.dict() for edge in workflow.edges],
            "user_id": "demo_user",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        DB["workflows"].append(new_workflow)
        logger.info(f"Yeni iş akışı oluşturuldu: {workflow.name}")

        return new_workflow
    except Exception as e:
        logger.error(f"İş akışı oluşturma hatası: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"İş akışı oluşturulamadı: {str(e)}",
        )


@app.get("/workflows")
async def get_workflows():
    """Tüm iş akışlarını listeler."""
    return DB["workflows"]


@app.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Belirli bir iş akışının detaylarını getirir."""
    for workflow in DB["workflows"]:
        if workflow["id"] == workflow_id:
            return workflow

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="İş akışı bulunamadı",
    )


@app.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Bir iş akışını siler."""
    for i, workflow in enumerate(DB["workflows"]):
        if workflow["id"] == workflow_id:
            workflow_name = workflow["name"]
            del DB["workflows"][i]
            logger.info(f"İş akışı silindi: {workflow_name}")
            return {"message": "İş akışı başarıyla silindi"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="İş akışı bulunamadı",
    )


# İş akışı yürütme endpoint'i
@app.post("/workflows/{workflow_id}/execute", response_model=WorkflowExecutionResult)
async def execute_workflow(
    workflow_id: str, execute_request: WorkflowExecuteRequest = Body(...)
):
    """Bir iş akışını yürütür."""
    # İş akışını bul
    workflow = None
    for wf in DB["workflows"]:
        if wf["id"] == workflow_id:
            workflow = wf
            break

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="İş akışı bulunamadı"
        )

    # API anahtarını kontrol et
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API anahtarı sunucu tarafında tanımlanmamış. Lütfen sunucu yöneticisine başvurun.",
        )

    # İş akışını yürüt
    result = execute_workflow_pipeline(
        workflow=workflow,
        input_text=execute_request.input_text,
        db=DB,
        openai_client=openai_client,
        openai_api_key=OPENAI_API_KEY,
        process_with_agent_fn=process_with_agent,
    )

    # Sonucu döndür
    return WorkflowExecutionResult(
        workflow_id=result["workflow_id"],
        results=result["results"],
        execution_time=result["execution_time"],
        status=result["status"],
    )
