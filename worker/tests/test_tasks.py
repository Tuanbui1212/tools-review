from app.tasks.system_tasks import ping


def test_ping_runs_locally() -> None:
    result = ping.apply().get()

    assert result["reply"] == "pong"
