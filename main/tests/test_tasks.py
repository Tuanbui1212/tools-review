from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.chapter import Chapter
from app.models.pipeline_task import PipelineTask
from app.models.project import Project
from app.models.user import User
from app.services.pipeline_task_service import PipelineTaskService
from tests.conftest import auth


def test_pipeline_task_service_and_api(
    client: TestClient,
    db_session: Session,
    make_user: Callable[..., User],
    login: Callable[..., dict],
) -> None:
    admin = make_user("admin", role="admin")
    tokens = login("admin")

    project = Project(
        name="Task Test Project",
        comic_type="manga",
        reading_direction="rtl",
        owner_id=admin.id,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    chapter = Chapter(
        project_id=project.id,
        chapter_number=1,
        title="Chapter 1",
        created_by_id=admin.id,
    )
    db_session.add(chapter)
    db_session.commit()
    db_session.refresh(chapter)

    # 2. Tạo task thông qua service
    service = PipelineTaskService(db_session)
    task = service.repo.add(
        PipelineTask(
            task_id="test-task-uuid-1234",
            project_id=project.id,
            chapter_id=chapter.id,
            task_type="panel_crop",
            queue_name="ai_queue",
            status="pending",
            progress=0,
            stage_message="Đang chờ AI worker...",
            created_by=admin.id,
        )
    )
    db_session.commit()
    db_session.refresh(task)

    # 3. GET /api/v1/tasks/{task_id}
    res = client.get(
        f"/api/v1/tasks/{task.task_id}",
        headers=auth(tokens),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["task_id"] == "test-task-uuid-1234"
    assert data["queue_name"] == "ai_queue"
    assert data["status"] == "pending"
    assert data["progress"] == 0

    # 4. PATCH /api/v1/internal/tasks/{task_id}/progress
    update_res = client.patch(
        f"/api/v1/internal/tasks/{task.task_id}/progress",
        json={
            "progress": 50,
            "stage_message": "Đang cắt khung trang 12/24",
            "status": "processing",
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["progress"] == 50
    assert updated_data["stage_message"] == "Đang cắt khung trang 12/24"
    assert updated_data["status"] == "processing"

    # 5. GET /api/v1/chapters/{chapter_id}/tasks
    chap_tasks_res = client.get(
        f"/api/v1/chapters/{chapter.id}/tasks",
        headers=auth(tokens),
    )
    assert chap_tasks_res.status_code == 200
    chap_tasks = chap_tasks_res.json()
    assert len(chap_tasks) >= 1
    assert chap_tasks[0]["task_id"] == "test-task-uuid-1234"

    # 6. GET /api/v1/projects/{project_id}/tasks
    proj_tasks_res = client.get(
        f"/api/v1/projects/{project.id}/tasks",
        headers=auth(tokens),
    )
    assert proj_tasks_res.status_code == 200
    proj_tasks = proj_tasks_res.json()
    assert len(proj_tasks) >= 1
    assert proj_tasks[0]["task_id"] == "test-task-uuid-1234"
