"""
OH-ID AI Platform: Enterprise Healthcare RAG & Knowledge Base Engine
Sathus Technology Pvt Ltd
"""

import uuid
import json
import logging
from typing import Dict, Any, Optional, List
from backend.app.services.ai.gateway import ai_gateway
from backend.app.services.ai.providers.base import AICompletionResponse, AICitation
from backend.app.database.session import get_readonly_cursor, get_db_cursor

logger = logging.getLogger("ohid.ai.rag_engine")

class HealthcareRAGEngine:
    """
    RAG engine for Hospital SOPs, Clinical Guidelines, Emergency Protocols, and Patient Education.
    Every answer includes direct citations to hospital knowledge documents.
    """

    @classmethod
    def ingest_document(
        cls,
        hospital_id: str,
        title: str,
        category: str,
        content: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Ingests and chunks an enterprise hospital knowledge document."""
        doc_id = f"kdoc-{uuid.uuid4().hex[:12]}"
        user_id = user_context.get("user_id")

        # Chunk content into paragraphs / sections
        paragraphs = [p.strip() for p in content.split("\n\n") if len(p.strip()) > 20]
        if not paragraphs:
            paragraphs = [content]

        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.knowledge_documents (
                    id, hospital_id, title, category, file_type, content, created_by
                ) VALUES (%s, %s, %s, %s, 'MARKDOWN', %s, %s);
            """, (doc_id, hospital_id, title, category, content, user_id))

            for idx, para in enumerate(paragraphs):
                chunk_id = f"kchunk-{uuid.uuid4().hex[:12]}"
                words = list(set([w.lower() for w in para.split() if len(w) > 3]))[:10]
                cur.execute("""
                    INSERT INTO oh_id.knowledge_chunks (
                        id, document_id, chunk_index, chunk_text, keywords
                    ) VALUES (%s, %s, %s, %s, %s);
                """, (chunk_id, doc_id, idx + 1, para, words))

        return {
            "document_id": doc_id,
            "title": title,
            "category": category,
            "chunks_created": len(paragraphs),
            "status": "INDEXED"
        }

    @classmethod
    async def query_knowledge_base(
        cls,
        hospital_id: str,
        query: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Queries hospital SOPs and returns a cited clinical/operational answer."""
        chunks: List[Dict[str, Any]] = []
        with get_readonly_cursor() as cur:
            pattern = f"%{query}%"
            cur.execute("""
                SELECT 
                    kd.id AS document_id,
                    kd.title,
                    kd.category,
                    kc.chunk_text,
                    kc.chunk_index
                FROM oh_id.knowledge_chunks kc
                JOIN oh_id.knowledge_documents kd ON kc.document_id = kd.id
                WHERE kd.hospital_id = %s AND kd.is_active = TRUE
                ORDER BY kc.created_at DESC
                LIMIT 5;
            """, (hospital_id,))
            chunks = [dict(r) for r in cur.fetchall()]

        context_str = "\n\n".join([
            f"[Source: {c.get('title')} (Section {c.get('chunk_index')})]:\n{c.get('chunk_text')}"
            for c in chunks
        ]) or "Standard Hospital Operating Protocol."

        user_prompt = (
            f"Query: \"{query}\"\n\n"
            f"Authoritative Hospital Protocols & SOPs:\n{context_str}\n\n"
            f"Answer the query based strictly on the provided documents. Cite the document title for each instruction."
        )

        response: AICompletionResponse = await ai_gateway.execute_prompt(
            prompt_key="DOCTOR_PATIENT_BRIEF",
            user_prompt=user_prompt,
            context_metadata={"hospital_id": hospital_id, "query": query},
            hospital_id=hospital_id,
            user_id=user_context.get("user_id"),
            module="RAG"
        )

        citations = [
            {
                "document_id": c.get("document_id"),
                "title": c.get("title"),
                "category": c.get("category"),
                "section": c.get("chunk_index")
            }
            for c in chunks
        ]

        return {
            "query": query,
            "answer_markdown": response.content,
            "citations": citations,
            "chunks_matched": len(chunks)
        }
