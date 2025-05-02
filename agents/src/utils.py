import os
import logging
from dotenv import load_dotenv
from openai import OpenAI

# Loglama yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("agent-workflow")


def load_environment():
    """Çevresel değişkenleri .env dosyasından yükler."""
    logger.info(f"Çalışma klasörü: {os.getcwd()}")
    env_paths = ["agent-workflow-backend/.env", ".env"]

    for path in env_paths:
        if os.path.exists(path):
            logger.info(f"{path} dosyası bulundu, yükleniyor...")
            load_dotenv(path)
            return True

    logger.warning(
        f"UYARI: .env dosyası bulunamadı! Aranılan konumlar: {', '.join(env_paths)}"
    )
    return False


def initialize_openai_client():
    """OpenAI API istemcisini yapılandırır ve başlatır."""
    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key:
        logger.warning("UYARI: OpenAI API anahtarı bulunamadı!")
        return None

    logger.info("OpenAI API anahtarı bulundu.")

    try:
        client = OpenAI(api_key=api_key)
        logger.info("OpenAI istemcisi başarıyla oluşturuldu.")
        return client
    except Exception as e:
        logger.error(f"OpenAI istemcisi oluşturulamadı: {str(e)}")
        return None
