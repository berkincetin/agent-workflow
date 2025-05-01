from typing import Dict, List, Any, Union, Optional
from datetime import datetime
import time
import uuid
from src.utils import logger


# Örnek ajanlar
def get_default_agents() -> List[Dict[str, Any]]:
    """Varsayılan ajanları döndürür."""
    return [
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


def process_start_agent(input_text: str) -> str:
    """START ajanı işlemi - iş akışı başlangıcı."""
    details = [
        f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
        f"İş akışı başlatıldı",
        f"Başlangıç metni: {input_text}",
    ]

    output = "İş Akışı Başlatıldı\n\n"
    output += "İşlem Detayları:\n"
    output += "\n".join([f"- {detail}" for detail in details])
    output += "\n\nBaşlangıç Metni:\n"
    output += f'"{input_text}"'

    logger.info(f"START ajan işlemi tamamlandı. Girdi: {input_text[:50]}...")
    return output


def process_end_agent(input_text: str, agent_chain: List[str]) -> str:
    """END ajanı işlemi - iş akışı bitişi."""
    agent_path = " -> ".join(agent_chain)

    details = [
        f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
        f"İş akışı tamamlandı",
        f"Toplam ajan sayısı: {len(agent_chain)}",
        f"Ajan zinciri: {agent_path}",
        f"Son işlenmiş metin: {input_text}",
    ]

    output = "İş Akışı Tamamlandı\n\n"
    output += "İşlem Detayları:\n"
    output += "\n".join([f"- {detail}" for detail in details])
    output += "\n\nSonuç Metni:\n"
    output += f'"{input_text}"'
    output += "\n\nBu iş akışı başarıyla tamamlanmıştır."

    logger.info(f"END ajan işlemi tamamlandı. Zincir: {agent_path}")
    return output


def process_loop_agent(
    input_text: str,
    agent_chain: List[str],
    previous_agents: List[Dict[str, Any]],
    openai_client,
) -> Union[str, Dict[str, Any]]:
    """LOOP ajanı işlemi - önceki ajanın promptunu kullanarak tekrar çalışır."""
    # Önceki ajanı kontrol et
    if len(agent_chain) < 2 or len(previous_agents) < 1:
        logger.warning("LOOP ajanı için önceki ajan bulunamadı")
        return (
            f"LOOP ajanı için önceki bir ajan bulunamadı. İşlenecek metin: {input_text}"
        )

    # En son ajanı bul (LOOP'un kendisi hariç)
    previous_agent = None
    for agent in reversed(previous_agents[:-1]):  # son eleman LOOP'un kendisi
        if agent["id"] != "LOOP" and agent["id"] != "START":
            previous_agent = agent
            break

    if not previous_agent:
        logger.warning("LOOP için uygun önceki ajan bulunamadı")
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

    try:
        logger.info(
            f"LOOP ajanı, '{previous_agent['name']}' ajanının promptunu kullanarak işlemi başlatıyor..."
        )

        # Önceki ajanın sistem mesajını al
        system_message = (
            "Aşağıdaki bilgiler ile sana bir rol verecek buna uygun net bir dil kullanarak yanıt ver."
            + "\n\n"
            + previous_agent["prompt"]
            + "\n\nNot: Bu metin daha önce işlenmiş ve şimdi LOOP ajanı tarafından derinleştirilecektir. Önceki içeriği genişlet ve daha detaylı hale getir."
        )

        # Kullanıcı mesajı
        user_message = f"İşlenecek metin: {input_text}\n\nBu metni daha da derinleştir ve genişlet."

        # API çağrısı
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

        # API yanıtı
        gpt_response = response.choices[0].message.content

        # İşleme detayları
        details.append(f"İşlem süresi: {(end_time - start_time):.2f} saniye")

        # Çıktı
        output = f"LOOP Ajanı ('{previous_agent['name']}' promptu ile) İşlem Sonucu\n\n"
        output += "İşlem Detayları:\n"
        output += "\n".join([f"- {detail}" for detail in details])
        output += "\n\nDerinleştirilmiş İçerik:\n"
        output += f'"{gpt_response}"'

        logger.info(f"LOOP ajan işlemi tamamlandı. Yanıt uzunluğu: {len(gpt_response)}")
        return {"output_text": output, "gpt_response": gpt_response}

    except Exception as e:
        logger.error(f"LOOP işleminde hata: {str(e)}")

        # Hata çıktısı
        output = f"LOOP Ajanı İşlemi (Hata) - Önceki ajan: {previous_agent['name']}\n\n"
        output += "İşlem Detayları:\n"
        output += "\n".join([f"- {detail}" for detail in details])
        output += f"\n\nHata: {str(e)}"
        output += "\n\nBu hata nedeniyle işlenemeyen metin:\n"
        output += f'"{input_text}"'

        return output


def process_gpt_agent(
    agent: Dict[str, Any],
    input_text: str,
    agent_chain: List[str],
    previous_agents: List[Dict[str, Any]],
    openai_client,
    openai_api_key: str,
) -> Union[str, Dict[str, Any]]:
    """GPT API kullanarak ajanı çalıştırır."""
    start_time = time.time()
    try:
        # Temel kontroller
        if not openai_client:
            logger.error("OpenAI istemcisi bulunamadı, API anahtarını kontrol edin")
            raise Exception(
                "OpenAI API istemcisi oluşturulamadı. API anahtarını kontrol edin."
            )

        if not openai_api_key:
            logger.error("OpenAI API anahtarı bulunamadı")
            raise Exception("OpenAI API anahtarı bulunamadı.")

        # Ajan zinciri metni
        agent_chain_text = " -> ".join(agent_chain)

        logger.info(f"GPT işlemi başlatılıyor: Ajan={agent['name']}")

        # Mesajları hazırla
        system_message = (
            "Aşağıdaki bilgiler ile sana bir rol verecek buna uygun net bir dil kullanarak yanıt ver."
            + "\n\n"
            + agent["prompt"]
        )

        # Önceki ajanın çıktısına göre ek bağlam
        additional_context = ""
        if len(agent_chain) > 1:
            additional_context = f"\n\nBu konu daha önce '{agent_chain[-2]}' ajanı tarafından işlenmiştir. Sen bir '{agent['name']}' olarak, bu konuyu daha da geliştirmelisin."

        # Kullanıcı mesajı
        user_message = (
            f"İşlenecek metin: {input_text}\n\n"
            f"Ajanlar zinciri: {agent_chain_text}{additional_context}"
        )

        # API anahtarı ve model kontrol
        logger.info(
            f"API isteği öncesi: Model=gpt-4.1-mini, Anahtar={openai_api_key[:5]}..."
        )

        # API çağrısı
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

        logger.info(
            f"GPT işlemi tamamlandı: Ajan={agent['name']}, Süre={(end_time - start_time):.2f} saniye"
        )

        # İşleme detayları
        processing_details = [
            f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
            f"Ajan adı: {agent['name']}",
            f"Ajan zinciri: {agent_chain_text}",
            f"İşlenen metin: {input_text[:100]}...",  # Uzun metinler için kısaltma
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

        # Çıktı metni
        output_text = f"Ajan '{agent['name']}' ile GPT işlemi tamamlandı\n\n"
        output_text += "İşlem Detayları:\n"
        output_text += "\n".join([f"- {detail}" for detail in processing_details])
        output_text += "\n\nTeknik Bilgiler:\n"
        output_text += "\n".join([f"- {detail}" for detail in technical_details])
        output_text += "\n\nGPT Yanıtı:\n"
        output_text += f'"{gpt_response}"'

        # Sonuç döndür
        logger.info(
            f"Ajan ({agent['name']}) çıktısı oluşturuldu, uzunluk: {len(gpt_response)}"
        )
        return {"output_text": output_text, "gpt_response": gpt_response}

    except Exception as e:
        logger.error(f"GPT işleminde hata: {str(e)}")

        # Hata durumunda yedek işlem
        agent_chain_text = " -> ".join(agent_chain)

        processing_details = [
            f"İşlem zamanı: {datetime.now().strftime('%H:%M:%S')}",
            f"Ajan adı: {agent['name']}",
            f"Ajan zinciri: {agent_chain_text}",
            f"İşlenen metin: {input_text[:100]}...",  # Uzun metinler için kısaltma
            f"Hata: {str(e)}",
            f"Not: GPT işlemi başarısız olduğu için yedek işlem kullanıldı.",
        ]

        technical_details = [
            f"İşleme tipi: Yedek işlem (GPT kullanılmadı)",
            f"Ajan sayısı: {len(agent_chain)}",
            f"Son ajan: {agent['name']}",
            f"Metin uzunluğu: {len(input_text)} karakter",
        ]

        output = f"Ajan '{agent['name']}' ile işlem tamamlandı (GPT hatası)\n\n"
        output += "İşlem Detayları:\n"
        output += "\n".join([f"- {detail}" for detail in processing_details])
        output += "\n\nTeknik Bilgiler:\n"
        output += "\n".join([f"- {detail}" for detail in technical_details])
        output += "\n\nİşlenmiş Metin:\n"
        output += f'"{input_text[:500]}..."'  # Çok uzun metinleri kısalt

        return output


def process_with_agent(
    agent: Dict[str, Any],
    input_text: str,
    agent_chain: List[str],
    previous_agents: List[Dict[str, Any]] = None,
    openai_client=None,
    openai_api_key: str = "",
) -> Union[str, Dict[str, Any]]:
    """
    Metni bir ajan ile işler.

    Args:
        agent: İşlem yapacak ajan
        input_text: İşlenecek metin
        agent_chain: İşlem zincirindeki ajanların adları
        previous_agents: Önceki ajanların bilgileri
        openai_client: OpenAI API istemcisi
        openai_api_key: OpenAI API anahtarı

    Returns:
        İşlenmiş metin veya işlem sonucu (dict)
    """
    # Debug bilgisi ekle
    logger.info(f"Ajan işlemi başlatılıyor: {agent['name']} (ID: {agent['id']})")
    logger.info(f"Girdi metni uzunluğu: {len(input_text)}")
    logger.info(f"Ajan zinciri: {' -> '.join(agent_chain)}")

    # previous_agents listesini hazırla
    if previous_agents is None:
        previous_agents = []

    # Kullanılan ajanı listeye ekle
    current_agent_data = {
        "id": agent["id"],
        "name": agent["name"],
        "prompt": agent["prompt"],
    }
    previous_agents.append(current_agent_data)

    # Özel ajan tipleri için işleme
    if agent["id"] == "START":
        logger.info("START ajanı çalıştırılıyor")
        return process_start_agent(input_text)
    elif agent["id"] == "END":
        logger.info("END ajanı çalıştırılıyor")
        return process_end_agent(input_text, agent_chain)
    elif agent["id"] == "LOOP":
        logger.info("LOOP ajanı çalıştırılıyor")
        return process_loop_agent(
            input_text, agent_chain, previous_agents, openai_client
        )

    # Normal ajanlar için GPT bazlı işleme
    logger.info(f"Normal GPT ajanı çalıştırılıyor: {agent['name']}")
    if not openai_client:
        logger.warning("OpenAI istemcisi bulunamadı, GPT işleme yapılamayacak")

    if not openai_api_key:
        logger.warning("OpenAI API anahtarı bulunamadı, GPT işleme yapılamayacak")

    # Ajanı çalıştır
    result = process_gpt_agent(
        agent, input_text, agent_chain, previous_agents, openai_client, openai_api_key
    )

    # Sonucu logla ve döndür
    if isinstance(result, dict) and "gpt_response" in result:
        logger.info(f"Ajan işlemi tamamlandı: {agent['name']}, GPT yanıtı alındı")
    else:
        logger.info(f"Ajan işlemi tamamlandı: {agent['name']}, basit çıktı oluşturuldu")

    return result
