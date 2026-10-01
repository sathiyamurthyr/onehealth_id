from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

data = []

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None

@app.get('/')
def root():
    return {'message': 'FastAPI backend ready!'}

@app.put('/items/{item_id}', response_model=Item)
def update_item(item_id: int, updated_item: Item):
    item = next((item for item in data if item.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail='Item not found')
    item.name = updated_item.name
    item.description = updated_item.description
    return item

@app.get('/items', response_model=List[Item])
def list_items():
    return data

@app.post('/items', response_model=Item)
def create_item(item: Item):
    item.id = len(data) + 1
    data.append(item)
    return item

@app.get('/items/{item_id}', response_model=Item)
def get_item(item_id: int):
    item = next((item for item in data if item.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail='Item not found')
    return item

@app.delete('/items/{item_id}', response_model=Item)
def delete_item(item_id: int):
    item = next((item for item in data if item.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail='Item not found')
    data.remove(item)
    return item