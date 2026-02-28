"""Supermemory integration for document storage and RAG retrieval."""

import logging
import os
import tempfile
from typing import Any

import httpx
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

    # Write to a temp file so the file handle carries the correct extension.
    # Supermemory's upload_file() uses the filename to detect content type;
    # a bare BytesIO has no .name and gets treated as "webpage".
    suffix = os.path.splitext(filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            result = client.documents.upload_file(
                file=f,
                container_tags=container_tag,
                metadata={"originalName": filename},
            )
    finally:
        os.unlink(tmp_path)

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


def get_document_status(doc_id: str) -> str:
    """Get the processing status of a document. Returns 'processing', 'done', or 'failed'."""
    client = _get_client()
    doc = client.documents.get(doc_id)
    return getattr(doc, "status", "unknown")


def delete_document(doc_id: str) -> None:
    """Delete a document from Supermemory."""
    client = _get_client()
    client.documents.delete(doc_id)
    log.info("Deleted document %s from Supermemory", doc_id)


def _user_tag(user_id: int, course_id: int) -> str:
    """Single concatenated container tag for per-user, per-course memories."""
    return f"user_{user_id}_course_{course_id}"


def add_user_memory(content: str, user_id: int, course_id: int) -> None:
    """Store a memory about a user's learning for a specific course."""
    client = _get_client()
    tag = _user_tag(user_id, course_id)
    try:
        client.add(content=content, container_tag=tag)
        log.info("Added user memory (tag=%s): %s", tag, content[:120])
    except Exception:
        log.exception("Failed to add user memory (tag=%s)", tag)


def search_user_memories(query: str, user_id: int, course_id: int, limit: int = 5) -> list[str]:
    """Search memories about a user's learning for a specific course."""
    client = _get_client()
    tag = _user_tag(user_id, course_id)
    try:
        results = client.search.memories(
            q=query,
            container_tag=tag,
            search_mode="hybrid",
            limit=limit,
        )
        chunks: list[str] = []
        for r in getattr(results, "results", None) or []:
            text = getattr(r, "chunk", None) or getattr(r, "memory", None) or ""
            if text:
                chunks.append(text.strip())
        log.info("User memory search (tag=%s): %d results for q=%r", tag, len(chunks), query[:60])
        return chunks
    except Exception:
        log.exception("User memory search failed (tag=%s)", tag)
        return []


def get_user_profile(user_id: int, course_id: int) -> dict[str, list[str]]:
    """Get the auto-built user profile + relevant memories from Supermemory."""
    client = _get_client()
    tag = _user_tag(user_id, course_id)
    empty = {"static": [], "dynamic": [], "memories": []}
    try:
        result = client.profile(
            container_tag=tag,
            q="student performance strengths weaknesses topics correct incorrect",
        )
        memories = []
        sr = getattr(result, "search_results", None)
        for r in getattr(sr, "results", None) or []:
            text = getattr(r, "memory", None) or getattr(r, "chunk", None) or ""
            if text:
                memories.append(text.strip())
        return {
            "static": getattr(result.profile, "static", []) or [],
            "dynamic": getattr(result.profile, "dynamic", []) or [],
            "memories": memories[:15],
        }
    except Exception:
        log.exception("Failed to get user profile (tag=%s)", tag)
        return empty


_SM_API_BASE = "https://api.supermemory.ai"


def _get_api_key() -> str:
    key = os.environ.get("SUPERMEMORY_API_KEY")
    if not key:
        raise RuntimeError("SUPERMEMORY_API_KEY environment variable is not set")
    return key


def get_graph_data(container_tags: list[str], limit: int = 300) -> dict[str, Any]:
    """Fetch documents with memory entries for the MemoryGraph component.

    Uses the /v3/documents/documents endpoint which returns the full
    DocumentWithMemories format that @supermemory/memory-graph expects.
    """
    api_key = _get_api_key()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = httpx.post(
            f"{_SM_API_BASE}/v3/documents/documents",
            headers=headers,
            json={
                "page": 1,
                "limit": limit,
                "sort": "createdAt",
                "order": "desc",
                "containerTags": container_tags,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        log.info(
            "Graph data: %d documents for tags=%s",
            len(data.get("documents", [])),
            container_tags,
        )
        return data
    except Exception:
        log.exception("Failed to fetch graph data")
        return {
            "documents": [],
            "pagination": {
                "currentPage": 1, "limit": limit,
                "totalItems": 0, "totalPages": 0,
            },
        }


def search(query: str, container_tag: str, limit: int = 8) -> list[str]:
    """Search Supermemory for relevant content chunks. Returns list of text strings."""
    client = _get_client()
    log.info("Supermemory search: q=%r, container_tag=%r, limit=%d", query[:80], container_tag, limit)
    results = client.search.memories(
        q=query,
        container_tag=container_tag,
        search_mode="hybrid",
        limit=limit,
    )
    log.info("Supermemory raw response type=%s, attrs=%s", type(results).__name__, dir(results))

    chunks: list[str] = []

    # The SDK response has a .results list; each item has .memory or .chunk
    result_list = getattr(results, "results", None) or []
    log.info("Supermemory returned %d results", len(result_list))

    for i, r in enumerate(result_list):
        log.debug("  result[%d] attrs=%s", i, [a for a in dir(r) if not a.startswith("_")])
        # Document chunks come back as .chunk, memories as .memory
        text = getattr(r, "chunk", None) or getattr(r, "memory", None) or ""
        if text:
            chunks.append(text.strip())
            log.debug("  result[%d] text=%r", i, text[:120])
        else:
            log.warning("  result[%d] had no chunk/memory content", i)

    log.info("Supermemory search returned %d non-empty chunks", len(chunks))
    return chunks
