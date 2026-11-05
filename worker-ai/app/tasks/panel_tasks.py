import os
import traceback
from datetime import datetime

from app.clients.main_client import MainClient
from app.core.config import get_settings
from app.services.panel_extractor import PanelExtractorService
from app.tasks.celery_app import celery_app

LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "worker_panel.log")


def log_task(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}\n"
    print(line, end="", flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


@celery_app.task(name="ai.extract_panels", bind=True)
def extract_panels_task(
    self,
    task_id: str,
    project_id: int,
    chapter_id: int,
    reading_direction: str = "rtl",
    **kwargs,
) -> dict:
    """Tác vụ Celery chạy nền: Cắt toàn bộ khung tranh cho một Chapter."""
    main_client = MainClient()
    extractor = PanelExtractorService()
    settings = get_settings()

    log_task(f"[START] Task {task_id}: Chapter {chapter_id}, Project {project_id}, hướng đọc {reading_direction}")

    # Báo tiến độ khởi tạo
    main_client.update_task_progress(
        task_id,
        5,
        "Đang chuẩn bị danh sách trang ảnh...",
        status="processing",
    )

    try:
        pages = main_client.get_chapter_pages(chapter_id)
        total_pages = len(pages)
        log_task(f"Lấy danh sách thành công: {total_pages} trang.")

        if total_pages == 0:
            main_client.update_task_progress(
                task_id,
                100,
                "Chapter chưa có trang ảnh nào để xử lý",
                status="error",
                error_message="Chapter has no pages",
            )
            return {"error": "Chapter has no pages"}

        # Thư mục lưu cache panel trên worker / storage
        panels_dir = os.path.join(
            "/srv/main/storage", "projects", str(project_id), "chapters", str(chapter_id), "panels"
        )
        # Nếu chạy local ngoài Docker thì fallback thư mục local
        if not os.path.exists("/srv/main/storage"):
            panels_dir = os.path.join(
                os.getcwd(), "storage", "projects", str(project_id), "chapters", str(chapter_id), "panels"
            )
        os.makedirs(panels_dir, exist_ok=True)

        all_extracted_panels: list[dict] = []
        global_panel_number = 1

        for i, page in enumerate(pages):
            page_id = page["id"]
            page_number = page["page_number"]
            log_task(f"--> [Trang {i + 1}/{total_pages}] Đang tải ảnh page_id={page_id}...")

            # Tải ảnh từ Main API (internal endpoint)
            image_bytes = main_client.download_page_file(chapter_id, page_id)
            log_task(f"    Tải xong ({len(image_bytes)} bytes). Đang bóc tách rãnh trắng...")

            # Cắt khung tranh
            prefix = f"p{page_number:03d}"
            page_panels = extractor.detect_and_crop_panels(
                image_bytes,
                reading_direction=reading_direction,
                output_dir=panels_dir,
                prefix=prefix,
            )
            log_task(f"    Cắt xong trang {i + 1}: Tìm thấy {len(page_panels)} khung tranh.")

            for p in page_panels:
                all_extracted_panels.append(
                    {
                        "chapter_page_id": page_id,
                        "panel_number": global_panel_number,
                        "panel_index_in_page": p["panel_index_in_page"],
                        "bbox_x": p["bbox_x"],
                        "bbox_y": p["bbox_y"],
                        "bbox_width": p["bbox_width"],
                        "bbox_height": p["bbox_height"],
                        "image_path": p["image_path"],
                        "is_full_page": p["is_full_page"],
                    }
                )
                global_panel_number += 1

            # Báo % tiến độ về Main (công thức: trang hoàn thành / tổng trang * 100)
            progress = int(((i + 1) / total_pages) * 90) + 5  # từ 5% đến 95%
            main_client.update_task_progress(
                task_id,
                progress,
                f"Đang cắt khung trang {i + 1}/{total_pages}...",
                status="processing",
            )

        # Gửi toàn bộ kết quả lưu vào Database của Main
        log_task(f"[SAVING] Đang lưu batch {len(all_extracted_panels)} khung tranh vào Database...")
        main_client.save_panels_batch(chapter_id, all_extracted_panels)
        log_task(f"[DONE] Hoàn tất cắt toàn bộ Chapter {chapter_id} thành công!")

        # Báo hoàn thành 100%
        result = {
            "total_pages": total_pages,
            "total_panels": len(all_extracted_panels),
        }
        main_client.update_task_progress(
            task_id,
            100,
            f"Hoàn thành! Đã bóc tách {len(all_extracted_panels)} khung tranh.",
            status="completed",
            result=result,
        )
        return result

    except Exception as e:
        err_msg = f"Lỗi xử lý cắt khung: {str(e)}"
        log_task(f"[ERROR] {err_msg}\n{traceback.format_exc()}")
        traceback.print_exc()
        main_client.update_task_progress(
            task_id,
            100,
            err_msg,
            status="error",
            error_message=traceback.format_exc(),
        )
        return {"error": str(e)}


@celery_app.task(name="ai.extract_single_page", bind=True)
def extract_single_page_task(
    self,
    project_id: int,
    chapter_id: int,
    page_id: int,
    reading_direction: str = "rtl",
    **kwargs,
) -> list[dict]:
    """Tác vụ Celery: Bóc tách khung tranh cho một trang đơn lẻ."""
    main_client = MainClient()
    extractor = PanelExtractorService()

    log_task(f"[SINGLE_PAGE] Bắt đầu cắt riêng trang page_id={page_id} (Chapter {chapter_id})...")
    image_bytes = main_client.download_page_file(chapter_id, page_id)
    log_task(f"  Tải xong {len(image_bytes)} bytes. Đang bóc tách rãnh trắng...")

    panels_dir = os.path.join(
        "/srv/main/storage", "projects", str(project_id), "chapters", str(chapter_id), "panels"
    )
    if not os.path.exists("/srv/main/storage"):
        panels_dir = os.path.join(
            os.getcwd(), "storage", "projects", str(project_id), "chapters", str(chapter_id), "panels"
        )
    os.makedirs(panels_dir, exist_ok=True)

    prefix = f"p_single_{page_id}"
    page_panels = extractor.detect_and_crop_panels(
        image_bytes,
        reading_direction=reading_direction,
        output_dir=panels_dir,
        prefix=prefix,
    )
    log_task(f"  Cắt xong: Tìm thấy {len(page_panels)} khung tranh.")

    formatted_panels = [
        {
            "panel_index_in_page": p["panel_index_in_page"],
            "bbox_x": p["bbox_x"],
            "bbox_y": p["bbox_y"],
            "bbox_width": p["bbox_width"],
            "bbox_height": p["bbox_height"],
            "image_path": p["image_path"],
            "is_full_page": p["is_full_page"],
        }
        for p in page_panels
    ]

    main_client.save_single_page_panels(chapter_id, page_id, formatted_panels)
    log_task(f"[SINGLE_PAGE] Lưu thành công {len(formatted_panels)} khung tranh cho trang {page_id}!")
    return formatted_panels

