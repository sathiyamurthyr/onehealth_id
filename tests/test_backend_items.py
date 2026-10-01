import importlib.util
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_MAIN_PATH = Path(__file__).resolve().parent.parent / "backend" / "main.py"
spec = importlib.util.spec_from_file_location("backend_main", BACKEND_MAIN_PATH)
backend_main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend_main)


@pytest.fixture(autouse=True)
def clean_backend_state():
    backend_main.data.clear()
    yield
    backend_main.data.clear()


@pytest.fixture
def client():
    return TestClient(backend_main.app)


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message": "FastAPI backend ready!"}


def test_items_crud_lifecycle(client):
    # 1. Create item
    create_res = client.post("/items", json={"name": "Widget A", "description": "High performance widget"})
    assert create_res.status_code == 200
    item = create_res.json()
    assert item["id"] == 1
    assert item["name"] == "Widget A"
    assert item["description"] == "High performance widget"

    # 2. List items
    list_res = client.get("/items")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == 1

    # 3. Get item by ID
    get_res = client.get("/items/1")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Widget A"

    # 4. Update item
    update_res = client.put("/items/1", json={"name": "Widget A Updated", "description": "Upgraded widget"})
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Widget A Updated"
    assert update_res.json()["description"] == "Upgraded widget"

    # 5. Delete item
    delete_res = client.delete("/items/1")
    assert delete_res.status_code == 200

    # 6. Verify deleted
    get_after_delete = client.get("/items/1")
    assert get_after_delete.status_code == 404


def test_get_nonexistent_item(client):
    res = client.get("/items/999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Item not found"


def test_update_nonexistent_item(client):
    res = client.put("/items/999", json={"name": "Missing", "description": "None"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Item not found"


def test_delete_nonexistent_item(client):
    res = client.delete("/items/999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Item not found"
