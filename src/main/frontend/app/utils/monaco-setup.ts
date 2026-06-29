import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

/*
 * Bundle Monaco's web workers with the app via Vite's worker instead of loading them
 * from a CDN.
 */
globalThis.MonacoEnvironment = {
  getWorker: (_workerId, label) => (label === 'json' ? new JsonWorker() : new EditorWorker()),
}
