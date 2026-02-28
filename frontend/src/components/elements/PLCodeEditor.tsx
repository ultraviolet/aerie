import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

// ---- Types ----

interface TestCase {
  input: unknown[];
  expected: unknown;
  description?: string;
}

interface TestResult {
  index: number;
  passed: boolean;
  actual?: string;
  expected?: string;
  error?: string;
  description?: string;
}

interface Props {
  answersName: string;
  language: string;
  fnName: string;
  starterCode: string;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled: boolean;
  visibleTestCases: TestCase[];
}

// ---- Pyodide Singleton ----

let pyodidePromise: Promise<unknown> | null = null;
let pyodideInstance: any = null;

function getPyodide(): Promise<any> {
  if (pyodideInstance) return Promise.resolve(pyodideInstance);
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = new Promise((resolve, reject) => {
    const tryLoad = () => {
      (window as any)
        .loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
        })
        .then((py: any) => {
          pyodideInstance = py;
          resolve(py);
        })
        .catch(reject);
    };

    if ((window as any).loadPyodide) {
      tryLoad();
    } else {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";
      script.onload = tryLoad;
      script.onerror = () => reject(new Error("Failed to load Pyodide"));
      document.head.appendChild(script);
    }
  });

  return pyodidePromise;
}

// ---- Component ----

export default function PLCodeEditor({
  answersName,
  language,
  fnName,
  starterCode,
  value,
  onChange,
  disabled,
  visibleTestCases,
}: Props) {
  const code = value || starterCode;
  const [running, setRunning] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [pyodideReady, setPyodideReady] = useState(!!pyodideInstance);

  // Preload Pyodide on mount
  useEffect(() => {
    if (pyodideInstance) {
      setPyodideReady(true);
      return;
    }
    setPyodideLoading(true);
    getPyodide()
      .then(() => setPyodideReady(true))
      .catch(() => {})
      .finally(() => setPyodideLoading(false));
  }, []);

  const handleCodeChange = useCallback(
    (val: string) => {
      onChange(answersName, val);
    },
    [answersName, onChange],
  );

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRunError(null);
    setTestResults([]);

    try {
      const pyodide = await getPyodide();

      const testCasesJson = JSON.stringify(visibleTestCases);
      const codeEscaped = JSON.stringify(code);

      const runnerScript = `
import json, sys, io

_old_stdout = sys.stdout
sys.stdout = io.StringIO()

try:
    exec(${codeEscaped})
except Exception as _e:
    sys.stdout = _old_stdout
    raise RuntimeError(f"Code error: {_e}")

sys.stdout = _old_stdout

_fn = globals().get(${JSON.stringify(fnName)})
if _fn is None:
    raise NameError("Function '${fnName}' not defined")

_test_cases = json.loads('''${testCasesJson}''')
_results = []
for _i, _tc in enumerate(_test_cases):
    try:
        _actual = _fn(*_tc["input"])
        _passed = (_actual == _tc["expected"])
        _results.append({
            "index": _i, "passed": _passed,
            "actual": repr(_actual), "expected": repr(_tc["expected"]),
            "description": _tc.get("description", ""),
        })
    except Exception as _e:
        _results.append({
            "index": _i, "passed": False,
            "error": str(_e), "expected": repr(_tc["expected"]),
            "description": _tc.get("description", ""),
        })

json.dumps({"results": _results})
`;

      const resultJson: string = await Promise.race([
        pyodide.runPythonAsync(runnerScript),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Execution timed out (5s). Check for infinite loops.",
                ),
              ),
            5000,
          ),
        ),
      ]);

      const parsed = JSON.parse(resultJson);
      setTestResults(parsed.results || []);
    } catch (err: any) {
      setRunError(err.message || "Execution failed");
    } finally {
      setRunning(false);
    }
  }, [code, fnName, visibleTestCases, running]);

  const allPassed =
    testResults.length > 0 && testResults.every((r) => r.passed);

  return (
    <div className="space-y-4">
      {/* Editor */}
      <div className="rounded-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">
            {language}
            {fnName ? ` | ${fnName}()` : ""}
          </span>
          {pyodideLoading && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Loading runtime...
            </span>
          )}
          {pyodideReady && !pyodideLoading && (
            <span className="text-xs text-green-500">Runtime ready</span>
          )}
        </div>
        <CodeMirror
          value={code}
          onChange={handleCodeChange}
          extensions={[python()]}
          theme={oneDark}
          height="300px"
          editable={!disabled}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            autocompletion: true,
            indentOnInput: true,
            tabSize: 4,
          }}
        />
      </div>

      {/* Run Button */}
      {!disabled && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={running || !code.trim()}
            className="gap-2"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? "Running..." : "Run Tests"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Runs {visibleTestCases.length} sample test
            {visibleTestCases.length !== 1 ? "s" : ""} in your browser
          </span>
        </div>
      )}

      {/* Run Error */}
      {runError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-red-500 mt-0.5 shrink-0" />
            <pre className="text-sm text-red-700 font-mono whitespace-pre-wrap">
              {runError}
            </pre>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div
            className={`px-3 py-2 text-sm font-medium ${
              allPassed
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {allPassed
              ? `All ${testResults.length} sample tests passed`
              : `${testResults.filter((r) => r.passed).length}/${testResults.length} sample tests passed`}
          </div>
          <div className="divide-y divide-slate-100">
            {testResults.map((r) => (
              <div
                key={r.index}
                className="px-3 py-2 flex items-start gap-2 text-sm"
              >
                {r.passed ? (
                  <CheckCircle2 className="size-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {r.description || `Test ${r.index + 1}`}
                  </div>
                  {!r.passed && (
                    <div className="mt-1 font-mono text-xs space-y-0.5">
                      {r.error ? (
                        <div className="text-red-600">Error: {r.error}</div>
                      ) : (
                        <>
                          <div className="text-muted-foreground">
                            Expected:{" "}
                            <span className="text-slate-700">
                              {r.expected}
                            </span>
                          </div>
                          <div className="text-red-600">
                            Got: <span>{r.actual}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visible Test Cases Reference (before first run) */}
      {visibleTestCases.length > 0 && testResults.length === 0 && !runError && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Sample test cases (click &quot;Run Tests&quot; to check):
          </p>
          <div className="space-y-1 font-mono text-xs">
            {visibleTestCases.map((tc, i) => (
              <div key={i} className="text-slate-600">
                <span className="text-slate-400">
                  {tc.description || `Test ${i + 1}`}:{" "}
                </span>
                {fnName}({tc.input.map((a) => JSON.stringify(a)).join(", ")})
                {" → "}
                <span className="text-slate-800">
                  {JSON.stringify(tc.expected)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
