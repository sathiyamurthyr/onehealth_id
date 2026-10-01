import chromadb

client = chromadb.PersistentClient(
    path=r"D:\AI\ChromaDB"
)

collection = client.get_or_create_collection("medical_docs")

collection.add(
    ids=["1"],
    documents=["Diabetes is a chronic disease."]
)

print(collection.count())