export function createLogger({ level = 'info' } = {}) {
  const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
  const threshold = levels[level] ?? levels.info;

  function write(entryLevel, message, fields = {}) {
    if ((levels[entryLevel] ?? levels.info) < threshold) {
      return;
    }

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: entryLevel,
      message,
      ...fields
    }));
  }

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields)
  };
}
