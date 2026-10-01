import importlib.util
from pathlib import Path
from fastapi.testclient import TestClient

SUBAPP_MAIN_PATH = Path(__file__).resolve().parent.parent / "backend" / "app" / "main.py"
spec = importlib.util.spec_from_file_location("subapp_main", SUBAPP_MAIN_PATH)
subapp_main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(subapp_main)


def test_subapp_root():
    client = TestClient(subapp_main.app)
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message": "Hello World"}
