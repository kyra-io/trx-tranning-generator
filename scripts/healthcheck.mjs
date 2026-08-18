const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 4_000);

try {
  const response = await fetch("http://127.0.0.1:3000/api/health", {
    signal: controller.signal,
  });
  process.exit(response.ok ? 0 : 1);
} catch {
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
