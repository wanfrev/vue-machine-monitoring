/**
 * Ejecuta `task` cada `intervalMs` solo mientras la pestaña está visible.
 *
 * - Con la pantalla apagada o la app en segundo plano no se consulta al servidor
 *   (ahorra batería, datos y carga en el backend).
 * - Al volver a estar visible, si pasó más de un intervalo desde el último
 *   refresco, se refresca de inmediato para no mostrar datos viejos.
 *
 * Devuelve una función para detener el refresco (llamarla en onUnmounted).
 */
export function startVisiblePolling(
  task: () => void | Promise<void>,
  intervalMs: number
): () => void {
  let timer: number | undefined;
  let lastRun = Date.now();

  const run = () => {
    lastRun = Date.now();
    void Promise.resolve()
      .then(task)
      .catch(() => undefined);
  };

  const start = () => {
    if (timer === undefined) timer = window.setInterval(run, intervalMs);
  };

  const stop = () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      stop();
      return;
    }
    if (Date.now() - lastRun >= intervalMs) run();
    start();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  if (!document.hidden) start();

  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
