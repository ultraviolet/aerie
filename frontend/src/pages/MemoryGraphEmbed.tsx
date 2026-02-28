import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MemoryGraph } from "@supermemory/memory-graph";
import { api } from "@/api";

/**
 * Standalone page that renders the MemoryGraph component.
 * Loaded via iframe to isolate its global CSS reset from the main app.
 */
export default function MemoryGraphEmbed() {
  const [params] = useSearchParams();
  const courseId = Number(params.get("courseId"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    api
      .getCourseGraph(courseId)
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <MemoryGraph documents={docs} isLoading={loading} variant="consumer" />
    </div>
  );
}
