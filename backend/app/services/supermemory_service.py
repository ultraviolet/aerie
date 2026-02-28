"""Supermemory integration for document storage and RAG retrieval."""

import io
import logging
import os
from typing import Any

from supermemory import Supermemory

log = logging.getLogger(__name__)

_client: Supermemory | None = None


def _get_client() -> Supermemory:
    global _client
    if _client is None:
        api_key = os.environ.get("SUPERMEMORY_API_KEY")
        if not api_key:
            raise RuntimeError("SUPERMEMORY_API_KEY environment variable is not set")
        _client = Supermemory(api_key=api_key)
    return _client


def upload_document(
    file_bytes: bytes,
    filename: str,
    container_tag: str,
) -> str:
    """Upload a file to Supermemory. Returns the supermemory document ID."""
    client = _get_client()
    result = client.documents.upload_file(
        file=io.BytesIO(file_bytes),
        container_tags=container_tag,
        metadata={"originalName": filename},
    )
    doc_id = result.id if hasattr(result, "id") else str(result)
    log.info("Uploaded %s to Supermemory (id=%s, tag=%s)", filename, doc_id, container_tag)
    return doc_id


def list_documents(container_tag: str) -> list[dict[str, Any]]:
    """List all documents in a container."""
    client = _get_client()
    result = client.documents.list(container_tags=[container_tag], limit=50)
    docs = []
    for mem in result.memories if hasattr(result, "memories") else []:
        docs.append({
            "id": mem.id,
            "title": getattr(mem, "title", None) or "Untitled",
            "status": getattr(mem, "status", "unknown"),
        })
    return docs


def delete_document(doc_id: str) -> None:
    """Delete a document from Supermemory."""
    client = _get_client()
    client.documents.delete(doc_id=doc_id)
    log.info("Deleted document %s from Supermemory", doc_id)


def search(query: str, container_tag: str, limit: int = 8) -> list[str]:
    """Search Supermemory for relevant content chunks. Returns list of text strings."""
    client = _get_client()
    results = client.search.memories(
        q=query,
        container_tag=container_tag,
        search_mode="hybrid",
        limit=limit,
    )
    chunks: list[str] = []
    for r in results.results if hasattr(results, "results") else []:
        text = getattr(r, "memory", None) or getattr(r, "chunk", None) or ""
        if text:
            chunks.append(text)
    return chunks
