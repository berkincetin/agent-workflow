from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr, field_serializer
from typing import List, Dict, Any, Optional, Annotated, Union
import uuid
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from jose import jwt, exceptions as jose_exceptions
from passlib.context import CryptContext
import json
from bson import ObjectId, json_util
import time
import random
import openai
from openai import OpenAI

# Dosya yolunu kontrol et ve .env dosyasını yükle
print(f"Çalışma klasörü: {os.getcwd()}")
env_path = "agent-workflow-backend/.env"
env_path_alternative = ".env"

# .env dosyasının varlığını kontrol et ve yükle
if os.path.exists(env_path):
    print(f"{env_path} dosyası bulundu, yükleniyor...")
    load_dotenv(env_path)
elif os.path.exists(env_path_alternative):
    print(f"{env_path_alternative} dosyası bulundu, yükleniyor...")
    load_dotenv(env_path_alternative)
else:
    print(
        f"UYARI: .env dosyası bulunamadı! Aranılan konumlar: {env_path}, {env_path_alternative}"
    )

# OpenAI API anahtarını kontrol et
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if OPENAI_API_KEY:
    print("OpenAI API anahtarı bulundu.")
else:
    print("UYARI: OpenAI API anahtarı bulunamadı!")

# OpenAI istemcisi
try:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    print("OpenAI istemcisi başarıyla oluşturuldu.")
except Exception as e:
    print(f"OpenAI istemcisi oluşturulamadı: {str(e)}")
    openai_client = None

# JWT ayarları
SECRET_KEY = os.getenv("SECRET_KEY", "gizli_anahtar_buraya_yazilmali")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 saat (önceki değer: 30 dakika)

# Şifre hash'leme
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB yerine bellekte saklamak için basit bir veritabanı
DB = {"users": [], "workflows": [], "agents": []}

# Örnek ajanlar
AGENTS = [
    {
        "id": "START",
        "name": "START",
        "description": "İş akışı başlangıç noktası",
        "prompt": "İş akışının başlangıç noktasıdır. Metni olduğu gibi geçirir.",
        "type": "system",
    },
    {
        "id": "END",
        "name": "END",
        "description": "İş akışı bitiş noktası",
        "prompt": "İş akışının bitiş noktasıdır. Son çıktıyı alır ve sonuçlandırır.",
        "type": "system",
    },
    {
        "id": "LOOP",
        "name": "LOOP",
        "description": "Önceki ajanın promptunu kullanarak tekrar çalışır",
        "prompt": "Gelen metni, önceki ajanın promptunu kullanarak tekrar işler ve derinleştirir.",
        "type": "system",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Araştırmacı",
        "description": "Temel araştırma ve bilgi toplama yapan ajan",
        "prompt": "Sen deneyimli bir araştırmacısın. Görevin, verilen konu hakkında temel bilgileri toplamak, ana kavramları açıklamak ve genel bir çerçeve çizmektir.\n\nYanıtında şunlara odaklan:\n1. Konunun temel tanımı ve genel açıklaması\n2. Ana kavramların ve terimlerin açıklamaları\n3. Konunun tarihsel gelişimi veya önemli dönüm noktaları\n4. İlgili veya bağlantılı alanlar\n\nHerkesin anlayabileceği açık ve net bir dil kullan. Karmaşık terimleri basitleştir ve bilgilerin doğru olmasına özen göster. Yanıtın, konunun genel bir anlayışını sunmalıdır.\n\nTalimatlara sadık kal ve sadece doğru bilgileri içeren, 300-500 kelimelik kapsamlı bir yanıt oluştur.",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Derin Araştırmacı",
        "description": "Detaylı ve derinlemesine analiz yapan ajan",
        "prompt": "Sen uzman bir derin araştırmacısın. Görevin, önceden araştırılmış bir konuyu derinlemesine analiz etmek ve ileri düzey bilgiler sunmaktır.\n\nYanıtında şunlara odaklan:\n1. İleri düzey kavramlar ve teorik çerçeveler\n2. Teknik detaylar ve özelleşmiş bilgiler\n3. Alandaki güncel araştırmalar ve tartışmalar\n4. Farklı yaklaşımlar ve metodolojiler arasındaki karşılaştırmalar\n\nUzman seviyesinde bir dil kullanabilirsin, ancak karmaşık kavramları da açıkla. Bilimsel araştırmalara ve güvenilir kaynaklara dayanan bilgiler sun. Yanıtın, konuyu derinlemesine analiz etmeli ve uzmanlaşmış bilgileri içermelidir.\n\nÖnceki araştırmacı ajanın sağladığı bilgileri genişlet ve derinleştir. Tekrara düşme, bunun yerine yeni bilgiler ve derinlemesine analizler ekle. Talimatlara sadık kal ve 400-700 kelimelik kapsamlı bir yanıt oluştur.",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "ArGe Uzmanı",
        "description": "Yenilikçi fikirler ve çözümler üreten ajan",
        "prompt": "Sen vizyoner bir ArGe uzmanısın. Görevin, önceden araştırılmış ve derinlemesine analiz edilmiş bir konu hakkında yenilikçi fikirler, potansiyel çözümler ve gelecek uygulamalar önermektir.\n\nYanıtında şunlara odaklan:\n1. Gelecek trendleri ve yenilikçi yaklaşımlar\n2. Potansiyel uygulama alanları ve çözüm önerileri\n3. İnovasyon fırsatları ve yeni araştırma yönleri\n4. Mevcut zorluklar ve bunları aşmaya yönelik yaratıcı çözümler\n\nYaratıcı ve ileriye dönük düşün. Mevcut bilgileri genişleterek yeni fikirler ve perspektifler sun. Önerdiğin fikirler hem yaratıcı hem de uygulanabilir olmalıdır.\n\nÖnceki araştırmacı ve derin araştırmacı ajanların sağladığı bilgileri baz alarak, bunları ileriye taşıyan ve yeni perspektifler sunan öneriler geliştir. Bilgileri tekrarlama, bunun yerine yenilikçi uygulamalara ve geleceğe odaklan. Talimatlara sadık kal ve 400-700 kelimelik vizyoner bir yanıt oluştur.",
    },
]

# Başlangıçta örnek ajanları ekle
DB["agents"] = AGENTS.copy()


# Model sınıfları
class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserInDB(UserBase):
    id: str
    password: str
    created_at: datetime


class UserResponse(UserBase):
    id: str


class Token(BaseModel):
    access_token: str
    token_type: str


class Node(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]


class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "default"


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[Node]
    edges: List[Edge]
    id: Optional[str] = None


class Agent(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: str


# İş akışı sonuç modelini tanımlayalım
class WorkflowExecutionResult(BaseModel):
    workflow_id: str
    results: List[
        Dict[str, Any]
    ]  # output alanı artık Dict[str, Any] tipini kabul edecek
    execution_time: float
    status: str


# İş akışı yürütme request modeli
class WorkflowExecuteRequest(BaseModel):
    input_text: str = ""
    # API anahtarı artık .env dosyasından alınacak, istemciden istenmeyecek


# Helper fonksiyonlar
def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(email: str):
    for user in DB["users"]:
        if user["email"] == email:
            return user
    return None


def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user["password"]):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jose_exceptions.JWTError:
        raise credentials_exception

    user = get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user


# Auth ve kullanıcı endpoints
@app.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    # Email benzersizliğini kontrol et
    if get_user_by_email(user.email):
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

    # Şifre olmadan kullanıcıyı döndür
    return {"id": user_id, "email": user.email, "full_name": user.full_name}


@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz email veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
    }


# Agent endpoints
@app.get("/agents")
async def get_agents():
    return DB["agents"]


@app.post("/agents")
async def create_agent(agent: Agent):
    # Yeni agent oluştur
    agent_id = str(uuid.uuid4())
    new_agent = {
        "id": agent_id,
        "name": agent.name,
        "description": agent.description or "",
        "prompt": agent.prompt,
        "created_at": datetime.utcnow(),
    }

    # Veritabanına ekle
    DB["agents"].append(new_agent)

    return new_agent


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    for agent in DB["agents"]:
        if agent["id"] == agent_id:
            return agent

    raise HTTPException(status_code=404, detail="Agent bulunamadı")


@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    for i, agent in enumerate(DB["agents"]):
        if agent["id"] == agent_id:
            # Agent'ı sil
            del DB["agents"][i]
            return {"message": "Agent başarıyla silindi"}

    raise HTTPException(status_code=404, detail="Agent bulunamadı")


# Workflow endpoints
@app.post("/workflows")
async def create_workflow(workflow: WorkflowBase):
    if workflow.id:
        # Mevcut workflow'u güncelle
        for i, wf in enumerate(DB["workflows"]):
            if wf["id"] == workflow.id:
                # Güncelleme yap
                updated_workflow = {
                    "id": workflow.id,
                    "name": workflow.name,
                    "description": workflow.description,
                    "nodes": [node.model_dump() for node in workflow.nodes],
                    "edges": [edge.model_dump() for edge in workflow.edges],
                    "user_id": wf.get("user_id", "demo_user"),
                    "created_at": wf["created_at"],
                    "updated_at": datetime.utcnow(),
                }
                DB["workflows"][i] = updated_workflow
                return updated_workflow

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow bulunamadı",
        )

    # Yeni workflow oluştur
    workflow_id = str(uuid.uuid4())
    new_workflow = {
        "id": workflow_id,
        "name": workflow.name,
        "description": workflow.description,
        "nodes": [node.model_dump() for node in workflow.nodes],
        "edges": [edge.model_dump() for edge in workflow.edges],
        "user_id": "demo_user",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    # Veritabanına ekle
    DB["workflows"].append(new_workflow)

    return new_workflow


@app.get("/workflows")
async def get_workflows():
    # Tüm workflow'ları getir
    return DB["workflows"]


@app.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    for workflow in DB["workflows"]:
        if workflow["id"] == workflow_id:
            return workflow

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Workflow bulunamadı",
    )


@app.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    for i, workflow in enumerate(DB["workflows"]):
        if workflow["id"] == workflow_id:
            # Workflow'u sil
            del DB["workflows"][i]
            return {"message": "Workflow başarıyla silindi"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Workflow bulunamadı",
    )


# İş akışı yürütme endpoint'i
@app.post("/workflows/{workflow_id}/execute", response_model=WorkflowExecutionResult)
async def execute_workflow(
    workflow_id: str, execute_request: WorkflowExecuteRequest = Body(...)
):
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

    # .env dosyasındaki API anahtarını kontrol et
    if not OPENAI_API_KEY:
        # API anahtarı yoksa uyarı ver
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API anahtarı sunucu tarafında tanımlanmamış. Lütfen sunucu yöneticisine başvurun.",
        )

    # OpenAI istemcisi zaten .env dosyasından alınan API anahtarını kullanıyor

    # İş akışı yürütme başlangıç zamanı
    start_time = time.time()

    # Sonuçları saklamak için liste
    results = []

    # İşlenmiş metin - her aşamada güncellenecek
    processed_text = execute_request.input_text

    # İşlenen ajanların isimlerini takip etmek için
    processed_agent_names = []

    # İşlenen ajanların tüm bilgilerini (id, name, prompt) takip etmek için
    previous_agents = []

    try:
        # İş akışındaki her düğüm (node) için işlem yap
        nodes = workflow["nodes"]

        # Düğümlerin bağlantılarını kontrol et ve sıralamayı belirle
        # Bu basit implementasyonda, edge'lerin kaynak ve hedeflerine bakarak bir sıralama yapıyoruz
        node_order = []
        edges = workflow["edges"]

        # Önce tüm node'ları ekle
        node_dict = {node["id"]: node for node in nodes}

        # Başlangıç node'larını bul (hedef olarak kullanılmayan kaynak node'lar)
        target_nodes = set(edge["target"] for edge in edges)
        start_nodes = [node["id"] for node in nodes if node["id"] not in target_nodes]

        # Başlangıç node'larını sıralamaya ekle
        for node_id in start_nodes:
            if node_id not in node_order:
                node_order.append(node_id)

        # Edge'leri takip ederek sıralama oluştur
        while len(node_order) < len(nodes):
            for edge in edges:
                source = edge["source"]
                target = edge["target"]

                # Eğer kaynak node sıralamada var, hedef node yoksa ekle
                if source in node_order and target not in node_order:
                    node_order.append(target)

        # Sıralamayı tam node listesi olarak dönüştür
        ordered_nodes = [
            node_dict[node_id] for node_id in node_order if node_id in node_dict
        ]

        # Eğer özel bir sıralama bulunamadıysa, direk nodes listesini kullan
        if not ordered_nodes:
            ordered_nodes = nodes

        # Sıralı node'lar üzerinde işlem yap
        for node in ordered_nodes:
            # Node'un agent ID'sini bul
            agent_id = node["data"].get("agentId")
            if not agent_id:
                continue

            # Agent'ı bul
            agent = None
            for a in DB["agents"]:
                if a["id"] == agent_id:
                    agent = a
                    break

            if not agent:
                continue

            # İşlenmiş ajan adlarını güncelle
            processed_agent_names.append(agent["name"])

            # Agent'ı çalıştır - güncel işlenmiş metni kullanarak
            output = process_with_agent(
                agent, processed_text, processed_agent_names, previous_agents
            )

            # Ajan türüne göre işlem
            if agent["id"] == "START":
                # START ajanı sadece metni geçiriyor, processed_text değişmez
                pass
            elif agent["id"] == "END":
                # END ajanı son işlemi yapıyor, processed_text değişmez
                pass
            else:
                # Normal ajan (GPT) için, çıktıyı al ve sonraki adım için processed_text'i güncelle
                # GPT çıktısını processed_text olarak ayarla
                if isinstance(output, dict) and "gpt_response" in output:
                    # Yanıtı doğrudan alıyoruz, herhangi bir işleme yapmadan
                    processed_text = output["gpt_response"]
                    print(f"GPT yanıtı alındı, uzunluk: {len(processed_text)} karakter")
                elif isinstance(output, str) and "GPT Yanıtı:" in output:
                    # Metin yanıtıysa, GPT Yanıtı bölümünü çıkarıp processed_text olarak ayarla
                    try:
                        response_part = output.split("GPT Yanıtı:")[1].strip()
                        # Tırnak işaretlerini kaldır
                        processed_text = response_part.strip("\"'")
                        print(
                            f"GPT yanıtı metin olarak ayrıştırıldı, uzunluk: {len(processed_text)} karakter"
                        )
                    except Exception as e:
                        print(f"GPT yanıtı ayrıştırılırken hata: {str(e)}")
                        print(f"Orijinal çıktı: {output[:100]}...")

            # Sonucu listeye ekle - Frontend'de uyumluluk için
            result_entry = {
                "node_id": node["id"],
                "agent_name": agent["name"],
                "processed_text": processed_text,
            }

            # output'u ayarlıyoruz - dict ya da string olabilir
            if isinstance(output, dict):
                # Dictionary olarak sadece output_text değerini doğrudan string olarak kullanıyoruz
                result_entry["output"] = output["output_text"]
                # Ayrıca GPT yanıtını da kaydediyoruz ama bunu frontend'e göndermiyoruz
                result_entry["gpt_response"] = output["gpt_response"]
            else:
                # Zaten string ise direkt kullanabiliriz
                result_entry["output"] = output

            results.append(result_entry)

            # Gerçek bir uygulama için her agent arasında veri transferi yapılabilir
            # Burada sadece demo amaçlı bir gecikme ekliyoruz
            time.sleep(random.uniform(0.2, 1.0))

        # İş akışı yürütme bitiş zamanı
        end_time = time.time()
        execution_time = end_time - start_time

        # Başarılı sonuç döndür
        return WorkflowExecutionResult(
            workflow_id=workflow_id,
            results=results,
            execution_time=execution_time,
            status="Başarılı",
        )

    except Exception as e:
        # Hata durumunda
        end_time = time.time()
        execution_time = end_time - start_time

        return WorkflowExecutionResult(
            workflow_id=workflow_id,
            results=results,
            execution_time=execution_time,
            status=f"Hata: {str(e)}",
        )


# LOOP ajanını işleyecek fonksiyon
def process_loop_agent(
    input_text: str, agent_chain: List[str], previous_agents: List[Dict[str, Any]]
) -> str:
    """
    LOOP ajanı işlemi

    Önceki ajanın promptunu kullanarak tekrar çalışır ve metni derinleştirir.
    """
    # Aynı agent_chain zincirinde birden fazla önceki ajan olabilir
    if len(agent_chain) < 2 or len(previous_agents) < 1:
        return (
            f"LOOP ajanı için önceki bir ajan bulunamadı. İşlenecek metin: {input_text}"
        )

    # En son ajanı al (LOOP'un kendisi hariç)
    previous_agent = None
    for agent in reversed(previous_agents[:-1]):  # son eleman LOOP'un kendisi
        if agent["id"] != "LOOP" and agent["id"] != "START":
            previous_agent = agent
            break

    if not previous_agent:
        return (
            f"LOOP için uygun bir önceki ajan bulunamadı. İşlenecek metin: {input_text}"
        )

    # İşleme detayları
    details = [
        f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
        f"LOOP ajanı çalışıyor",
        f"Önceki ajan: {previous_agent['name']}",
        f"Önceki ajan promptu kullanılarak metin tekrar işleniyor",
        f"İşlenecek metin: {input_text}",
    ]

    # Önceki ajanın promptunu kullanarak tekrar işleme
    try:
        print(
            f"LOOP ajanı, '{previous_agent['name']}' ajanının promptunu kullanarak işlemi başlatıyor..."
        )

        # Önceki ajanın sistem mesajını al
        system_message = (
            "Aşağıdaki bilgiler ile sana bir rol verecek buna uygun net bir dil kullanarak yanıt ver."
            + "\n\n"
            + previous_agent["prompt"]
            + "\n\nNot: Bu metin daha önce işlenmiş ve şimdi LOOP ajanı tarafından derinleştirilecektir. Önceki içeriği genişlet ve daha detaylı hale getir."
        )

        # Kullanıcı mesajını oluştur
        user_message = f"İşlenecek metin: {input_text}\n\nBu metni daha da derinleştir ve genişlet."

        # OpenAI API çağrısı
        start_time = time.time()
        if not openai_client:
            raise Exception("OpenAI API istemcisi bulunamadı.")

        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000,
            temperature=0.7,
        )
        end_time = time.time()

        # API yanıtını al
        gpt_response = response.choices[0].message.content

        # İşleme detayları ekle
        details.append(f"İşlem süresi: {(end_time - start_time):.2f} saniye")

        # Çıktıyı birleştir
        output = f"LOOP Ajanı ('{previous_agent['name']}' promptu ile) İşlem Sonucu\n\n"
        output += "İşlem Detayları:\n"
        output += "\n".join([f"- {detail}" for detail in details])
        output += "\n\nDerinleştirilmiş İçerik:\n"
        output += f'"{gpt_response}"'

        # Döndürülecek yapı: Hem tam çıktı hem de gpt yanıtı
        result_dict = {"output_text": output, "gpt_response": gpt_response}

        return result_dict

    except Exception as e:
        print(f"LOOP işleminde hata: {str(e)}")

        # Çıktıyı birleştir (hata durumunda)
        output = f"LOOP Ajanı İşlemi (Hata) - Önceki ajan: {previous_agent['name']}\n\n"
        output += "İşlem Detayları:\n"
        output += "\n".join([f"- {detail}" for detail in details])
        output += f"\n\nHata: {str(e)}"
        output += "\n\nBu hata nedeniyle işlenemeyen metin:\n"
        output += f'"{input_text}"'

        return output


# Agent ile işleme
def process_with_agent(
    agent: Dict[str, Any],
    input_text: str,
    agent_chain: List[str],
    previous_agents: List[Dict[str, Any]] = None,
) -> str | Dict[str, Any]:
    """
    Agent ile metni işleme

    Önceki ajanlardan gelen metni alır, işler ve yeni metni döndürür.
    """
    start_time = time.time()

    # Eğer previous_agents parametresi verilmediyse, boş liste olarak başlat
    if previous_agents is None:
        previous_agents = []

    # Kullanılan ajanı previous_agents listesine ekle
    current_agent_data = {
        "id": agent["id"],
        "name": agent["name"],
        "prompt": agent["prompt"],
    }
    previous_agents.append(current_agent_data)

    # Özel ajan tipleri için işleme
    if agent["id"] == "START":
        return process_start_agent(input_text)
    elif agent["id"] == "END":
        return process_end_agent(input_text, agent_chain)
    elif agent["id"] == "LOOP":
        return process_loop_agent(input_text, agent_chain, previous_agents)

    # Normal ajanlar için GPT bazlı işleme
    try:
        # OpenAI client kontrolü
        if not openai_client:
            raise Exception(
                "OpenAI API istemcisi oluşturulamadı. API anahtarını kontrol edin."
            )

        # API anahtarını kontrol et
        if not OPENAI_API_KEY:
            raise Exception("OpenAI API anahtarı bulunamadı.")

        # Ajan zinciri metni
        agent_chain_text = " -> ".join(agent_chain)

        print(
            f"GPT işlemi başlatılıyor: Ajan={agent['name']}, API Key={OPENAI_API_KEY[:5]}..."
        )

        # Ajan prompt'unu ve metin girişini birleştir
        system_message = agent["prompt"]

        # Önceki ajanın çıktısına göre farklı prompt hazırlama
        additional_context = ""
        if len(agent_chain) > 1:
            additional_context = f"\n\nBu konu daha önce '{agent_chain[-2]}' ajanı tarafından işlenmiştir. Sen bir '{agent['name']}' olarak, bu konuyu daha da geliştirmelisin."

        # Kullanıcı mesajını oluşturma
        user_message = (
            f"İşlenecek metin: {input_text}\n\n"
            f"Ajanlar zinciri: {agent_chain_text}{additional_context}"
        )

        system_message = (
            "Aşağıdaki bilgiler ile sana bir rol verecek buna uygun net bir dil kullanarak yanıt ver."
            + "\n\n"
            + system_message
        )
        # OpenAI API çağrısı
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000,
            temperature=0.7,
        )
        end_time = time.time()

        print(
            f"GPT işlemi tamamlandı: Ajan={agent['name']}, Süre={(end_time - start_time):.2f} saniye"
        )

        # API yanıtını al
        gpt_response = response.choices[0].message.content

        # İşleme detayları oluştur
        processing_details = [
            f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
            f"Ajan adı: {agent['name']}",
            f"Ajan zinciri: {agent_chain_text}",
            f"İşlenen metin: {input_text}",
            f"İşlem süresi: {(end_time - start_time):.2f} saniye",
        ]

        # Teknik detaylar
        technical_details = [
            f"İşleme tipi: GPT ile metin işleme",
            f"Model: gpt-4.1-mini",
            f"Ajan sayısı: {len(agent_chain)}",
            f"Son ajan: {agent['name']}",
            f"Metin uzunluğu: {len(input_text)} karakter",
            f"Yanıt uzunluğu: {len(gpt_response)} karakter",
        ]

        # Çıktı metnini oluştur
        output_text = f"Ajan '{agent['name']}' ile GPT işlemi tamamlandı\n\n"
        output_text += "İşlem Detayları:\n"
        output_text += "\n".join([f"- {detail}" for detail in processing_details])
        output_text += "\n\nTeknik Bilgiler:\n"
        output_text += "\n".join([f"- {detail}" for detail in technical_details])
        output_text += "\n\nGPT Yanıtı:\n"
        output_text += f'"{gpt_response}"'

        # JSON ile uyumlu obje döndür
        result_dict = {"output_text": output_text, "gpt_response": gpt_response}

        return result_dict

    except Exception as e:
        print(f"GPT işleminde hata: {str(e)}")

        # Hata durumunda, orijinal yedek yöntemi kullan
        agent_chain_text = " -> ".join(agent_chain)

        processing_details = [
            f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
            f"Ajan adı: {agent['name']}",
            f"Ajan zinciri: {agent_chain_text}",
            f"İşlenen metin: {input_text}",
            f"Hata: {str(e)}",
            f"Not: GPT işlemi başarısız olduğu için yedek işlem kullanıldı.",
        ]

        # Teknik detaylar
        technical_details = [
            f"İşleme tipi: Yedek işlem (GPT kullanılmadı)",
            f"Ajan sayısı: {len(agent_chain)}",
            f"Son ajan: {agent['name']}",
            f"Metin uzunluğu: {len(input_text)} karakter",
        ]

        # Çıktıyı birleştir
        output = f"Ajan '{agent['name']}' ile işlem tamamlandı (GPT hatası)\n\n"
        output += "İşlem Detayları:\n"
        output += "\n".join([f"- {detail}" for detail in processing_details])
        output += "\n\nTeknik Bilgiler:\n"
        output += "\n".join([f"- {detail}" for detail in technical_details])
        output += "\n\nİşlenmiş Metin:\n"
        output += f'"{input_text}"'

        return output


# START ajanı için işleme
def process_start_agent(input_text: str) -> str:
    """
    START ajanı işlemi

    İş akışı başlangıcını simüle eder.
    """
    # İşleme detayları
    details = [
        f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
        f"İş akışı başlatıldı",
        f"Başlangıç metni: {input_text}",
    ]

    # Çıktıyı birleştir
    output = "İş Akışı Başlatıldı\n\n"
    output += "İşlem Detayları:\n"
    output += "\n".join([f"- {detail}" for detail in details])
    output += "\n\nBaşlangıç Metni:\n"
    output += f'"{input_text}"'

    return output


# END ajanı için işleme
def process_end_agent(input_text: str, agent_chain: List[str]) -> str:
    """
    END ajanı işlemi

    İş akışı bitişini simüle eder ve son çıktıyı döndürür.
    """
    # Ajan zinciri metni
    agent_path = " -> ".join(agent_chain)

    # İşleme detayları
    details = [
        f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
        f"İş akışı tamamlandı",
        f"Toplam ajan sayısı: {len(agent_chain)}",
        f"Ajan zinciri: {agent_path}",
        f"Son işlenmiş metin: {input_text}",
    ]

    # Çıktıyı birleştir
    output = "İş Akışı Tamamlandı\n\n"
    output += "İşlem Detayları:\n"
    output += "\n".join([f"- {detail}" for detail in details])
    output += "\n\nSonuç Metni:\n"
    output += f'"{input_text}"'
    output += "\n\nBu iş akışı başarıyla tamamlanmıştır."

    return output
