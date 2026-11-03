import os
import traceback

from app.clients.main_client import MainClient
from app.core.config import get_settings
from app.services.panel_extractor import PanelExtractorService
from app.tasks.celery_app import celery_app


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

            # Tải ảnh từ Main API
            image_bytes = main_client.download_page_file(chapter_id, page_id)

            # Cắt khung tranh
            prefix = f"p{page_number:03d}"
            page_panels = extractor.detect_and_crop_panels(
                image_bytes,
                reading_direction=reading_direction,
                output_dir=panels_dir,
                prefix=prefix,
            )

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
        main_client.save_panels_batch(chapter_id, all_extracted_panels)

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
        traceback.print_exc()
        main_client.update_task_progress(
            task_id,
            100,
            err_msg,
            status="error",
            error_message=traceback.format_exc(),
        )
        return {"error": str(e)}
