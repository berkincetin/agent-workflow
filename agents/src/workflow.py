from typing import Dict, List, Any, Callable, Union
import time
from datetime import datetime
from src.utils import logger


def sort_workflow_nodes(
    nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    İş akışı düğümlerini sıralar.

    Args:
        nodes: Sıralanacak düğümler listesi
        edges: Düğümleri bağlayan kenarlar listesi

    Returns:
        Sıralanmış düğümler listesi
    """
    logger.info(
        f"İş akışı düğümleri sıralanıyor. Düğüm sayısı: {len(nodes)}, Kenar sayısı: {len(edges)}"
    )

    # Düğümlerin bir kopyasını oluştur
    sorted_nodes = nodes.copy()

    # Eğer düğüm yoksa boş liste döndür
    if not sorted_nodes:
        logger.warning("Sıralanacak düğüm bulunamadı")
        return []

    # START düğümünü bul ve en başa yerleştir
    start_node_index = None
    for i, node in enumerate(sorted_nodes):
        if node["data"]["label"] == "START":
            start_node_index = i
            break

    if start_node_index is not None:
        # START düğümünü en başa taşı
        start_node = sorted_nodes.pop(start_node_index)
        sorted_nodes.insert(0, start_node)
    else:
        logger.warning("START düğümü bulunamadı, sıralama sorunlu olabilir")

    # Kenarları düğüm ID'lerine göre eşleştirelim
    # source -> [target1, target2, ...]
    edge_map = {}
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source not in edge_map:
            edge_map[source] = []
        edge_map[source].append(target)

    # Düğümlerin sırasını kenar bağlantılarına göre düzenle
    if start_node_index is not None:
        visited = set([sorted_nodes[0]["id"]])  # START düğümü ziyaret edildi
        i = 0

        while i < len(sorted_nodes):
            current_node_id = sorted_nodes[i]["id"]

            # Bu düğümden çıkan kenarları kontrol et
            if current_node_id in edge_map:
                for target_id in edge_map[current_node_id]:
                    # Hedef düğümü bul
                    target_index = None
                    for j, node in enumerate(sorted_nodes):
                        if node["id"] == target_id and target_id not in visited:
                            target_index = j
                            break

                    # Eğer hedef düğüm bulunduysa ve ziyaret edilmediyse
                    if target_index is not None:
                        # Düğümü mevcut düğümün hemen arkasına taşı
                        target_node = sorted_nodes.pop(target_index)
                        sorted_nodes.insert(i + 1, target_node)
                        visited.add(target_id)

            i += 1

    logger.info(f"Düğüm sıralama tamamlandı. Sıralı düğüm sayısı: {len(sorted_nodes)}")

    # Sıralı düğüm ID'lerini log'a ekle
    node_sequence = " -> ".join([node["data"]["label"] for node in sorted_nodes])
    logger.info(f"Düğüm sıralaması: {node_sequence}")

    return sorted_nodes


def validate_workflow_structure(nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    İş akışı yapısını doğrular (START ile başlayıp END ile bitmeli).

    Args:
        nodes: İş akışı düğümleri

    Returns:
        Doğrulama sonucu: {"valid": bool, "message": str}
    """
    # Eğer düğüm yoksa geçersiz
    if not nodes:
        return {"valid": False, "message": "İş akışında düğüm bulunamadı"}

    # İlk düğümün START olduğunu kontrol et
    if nodes[0]["data"]["label"] != "START":
        return {"valid": False, "message": "İş akışı START düğümü ile başlamalıdır"}

    # Son düğümün END olduğunu kontrol et
    if nodes[-1]["data"]["label"] != "END":
        return {"valid": False, "message": "İş akışı END düğümü ile bitmelidir"}

    # Hem START hem de END düğümlerinin sayısını kontrol et
    start_count = sum(1 for node in nodes if node["data"]["label"] == "START")
    end_count = sum(1 for node in nodes if node["data"]["label"] == "END")

    if start_count != 1:
        return {
            "valid": False,
            "message": f"İş akışında tek bir START düğümü olmalıdır, mevcut: {start_count}",
        }

    if end_count != 1:
        return {
            "valid": False,
            "message": f"İş akışında tek bir END düğümü olmalıdır, mevcut: {end_count}",
        }

    # Tüm kontroller geçildi
    return {"valid": True, "message": "İş akışı yapısı geçerli"}


def process_workflow_node(
    node: Dict[str, Any],
    input_text: str,
    agent_chain: List[str],
    previous_agents: List[Dict[str, Any]],
    db: Dict[str, List[Dict[str, Any]]],
    openai_client: Any,
    openai_api_key: str,
    process_with_agent_fn: Callable,
) -> Union[str, Dict[str, Any]]:
    """
    Bir iş akışı düğümünü işler.

    Args:
        node: İşlenecek düğüm
        input_text: Giriş metni
        agent_chain: Ajanların zinciri
        previous_agents: Önceki ajanlar
        db: Veritabanı
        openai_client: OpenAI istemcisi
        openai_api_key: OpenAI API anahtarı
        process_with_agent_fn: Ajan işleme fonksiyonu

    Returns:
        İşlenmiş çıktı
    """
    node_id = node["data"].get("agentId", node["id"])
    node_label = node["data"]["label"]
    agent_chain.append(node_label)

    logger.info(f"Düğüm işleniyor: {node_label} (ID: {node_id})")

    # İlgili ajanı bul
    agent = None
    for a in db["agents"]:
        if a["id"] == node_id:
            agent = a
            break

    if not agent:
        error_msg = f"Ajan bulunamadı: {node_id}"
        logger.error(error_msg)
        return error_msg

    logger.info(f"Ajan bulundu: {agent['name']} (ID: {agent['id']})")

    # Ajanı çalıştır
    try:
        logger.info(f"Ajan işlemi başlatılıyor: {agent['name']}")
        result = process_with_agent_fn(
            agent=agent,
            input_text=input_text,
            agent_chain=agent_chain,
            previous_agents=previous_agents,
            openai_client=openai_client,
            openai_api_key=openai_api_key,
        )

        # Sonuç kontrolü
        if isinstance(result, dict) and "gpt_response" in result:
            logger.info(f"Ajan işlemi başarılı: {agent['name']}, GPT yanıtı alındı")
            return result
        else:
            logger.info(f"Ajan işlemi başarılı: {agent['name']}, metin yanıtı alındı")
            return result
    except Exception as e:
        error_msg = f"Ajan işleminde hata: {str(e)}"
        logger.error(error_msg)
        return error_msg


def execute_workflow_pipeline(
    workflow: Dict[str, Any],
    input_text: str,
    db: Dict[str, List[Dict[str, Any]]],
    openai_client: Any,
    openai_api_key: str,
    process_with_agent_fn: Callable,
) -> Dict[str, Any]:
    """
    İş akışını yürütür.

    Args:
        workflow: İş akışı
        input_text: Giriş metni
        db: Veritabanı
        openai_client: OpenAI istemcisi
        openai_api_key: OpenAI API anahtarı
        process_with_agent_fn: Ajan işleme fonksiyonu

    Returns:
        İş akışı sonuçları
    """
    start_time = time.time()
    results = []
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])

    logger.info(f"İş akışı yürütülüyor: {workflow['name']} (ID: {workflow['id']})")
    logger.info(f"Düğüm sayısı: {len(nodes)}, Kenar sayısı: {len(edges)}")

    try:
        # Düğümleri kenar bağlantılarına göre sırala
        sorted_nodes = sort_workflow_nodes(nodes, edges)
        if not sorted_nodes:
            error_msg = "İş akışında düğüm bulunamadı veya sıralama başarısız oldu"
            logger.error(error_msg)
            return {
                "workflow_id": workflow["id"],
                "results": [
                    {
                        "node_id": "error",
                        "agent_name": "Error",
                        "output": error_msg,
                        "processed_text": "",
                    }
                ],
                "execution_time": 0,
                "status": "failed",
            }

        # İş akışı yapısını doğrula (START ile başlayıp END ile bitmeli)
        validation_result = validate_workflow_structure(sorted_nodes)
        if not validation_result["valid"]:
            error_msg = validation_result["message"]
            logger.error(f"İş akışı yapı doğrulama hatası: {error_msg}")
            return {
                "workflow_id": workflow["id"],
                "results": [
                    {
                        "node_id": "error",
                        "agent_name": "Yapı Hatası",
                        "output": error_msg,
                        "processed_text": "",
                    }
                ],
                "execution_time": 0,
                "status": "failed",
            }

        # Düğümlerin sırasını loglayalım
        node_sequence = " -> ".join([node["data"]["label"] for node in sorted_nodes])
        logger.info(f"İşlem sırası: {node_sequence}")

        # Her düğümü sırayla işle
        current_text = input_text
        agent_chain = []
        previous_agents = []

        # İşlenecek toplam düğüm sayısını loglama
        logger.info(f"Toplam işlenecek düğüm sayısı: {len(sorted_nodes)}")

        for i, node in enumerate(sorted_nodes):
            logger.info(
                f"Düğüm işleniyor ({i+1}/{len(sorted_nodes)}): {node['data']['label']}"
            )

            # Düğümü işle
            result = process_workflow_node(
                node=node,
                input_text=current_text,
                agent_chain=agent_chain,
                previous_agents=previous_agents,
                db=db,
                openai_client=openai_client,
                openai_api_key=openai_api_key,
                process_with_agent_fn=process_with_agent_fn,
            )

            # Sonuç girişi oluştur
            result_entry = {
                "node_id": node["id"],
                "agent_name": node["data"]["label"],
                "processed_text": current_text,
            }

            # Sonraki adıma geçmek için çıktı metnini güncelle
            if isinstance(result, dict) and "gpt_response" in result:
                current_text = result["gpt_response"]
                result_entry["output"] = result["output_text"]
                results.append(result_entry)
                logger.info(
                    f"Düğüm işlendi, sonraki metne geçiliyor (GPT yanıtı): {node['data']['label']}"
                )
            else:
                current_text = result
                result_entry["output"] = result
                results.append(result_entry)
                logger.info(
                    f"Düğüm işlendi, sonraki metne geçiliyor (metin yanıtı): {node['data']['label']}"
                )

        end_time = time.time()
        execution_time = end_time - start_time

        logger.info(
            f"İş akışı tamamlandı: {workflow['name']}, Süre: {execution_time:.2f} saniye"
        )

        return {
            "workflow_id": workflow["id"],
            "results": results,
            "execution_time": execution_time,
            "status": "success",
        }

    except Exception as e:
        end_time = time.time()
        execution_time = end_time - start_time

        error_msg = f"İş akışı yürütme hatası: {str(e)}"
        logger.error(error_msg)

        return {
            "workflow_id": workflow["id"],
            "results": [
                {
                    "node_id": "error",
                    "agent_name": "Error",
                    "output": error_msg,
                    "processed_text": "",
                }
            ],
            "execution_time": execution_time,
            "status": "failed",
        }
