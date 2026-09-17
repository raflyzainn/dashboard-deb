/** One request at a time; hidden tabs pause and failed requests back off. */
export function pollVisible(task: () => Promise<void>, interval: number, immediate = false) {
  let stopped = false, running = false, delay = interval;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function run() {
    if (stopped || running) return;
    clearTimeout(timer);
    if (document.hidden) return;
    running = true;
    try { await task(); delay = interval; }
    catch { delay = Math.min(delay * 2, 60000); }
    finally {
      running = false;
      if (!stopped) timer = setTimeout(run, delay);
    }
  }
  const visible = () => { if (!document.hidden) void run(); else clearTimeout(timer); };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('focus', visible);
  timer = setTimeout(run, immediate ? 0 : interval);
  return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); };
}
