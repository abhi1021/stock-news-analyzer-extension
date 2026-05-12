// ─────────────────────────────────────────────
// CHROME EXTENSION LOGGER
// Captures console logs and stores them for debugging
// ─────────────────────────────────────────────

const Logger = (function() {
  const MAX_LOGS = 1000; // Maximum number of log entries to keep
  const STORAGE_KEY = 'extensionLogs';

  let logs = [];
  let isInitialized = false;

  // Original console methods
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  function getTimestamp() {
    const now = new Date();
    return now.toISOString();
  }

  function formatLogEntry(level, args) {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    return {
      timestamp: getTimestamp(),
      level: level,
      message: message
    };
  }

  function addLog(level, args) {
    const entry = formatLogEntry(level, args);
    logs.push(entry);

    // Rotate logs if exceeded max
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(-MAX_LOGS);
    }

    // Save to storage (async, non-blocking)
    saveLogs();
  }

  function saveLogs() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEY]: logs }).catch(err => {
        originalConsole.error('Failed to save logs:', err);
      });
    }
  }

  function loadLogs(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result[STORAGE_KEY]) {
          logs = result[STORAGE_KEY];
        }
        if (callback) callback();
      });
    }
  }

  function interceptConsole() {
    console.log = function(...args) {
      originalConsole.log(...args);
      addLog('LOG', args);
    };

    console.error = function(...args) {
      originalConsole.error(...args);
      addLog('ERROR', args);
    };

    console.warn = function(...args) {
      originalConsole.warn(...args);
      addLog('WARN', args);
    };

    console.info = function(...args) {
      originalConsole.info(...args);
      addLog('INFO', args);
    };

    console.debug = function(...args) {
      originalConsole.debug(...args);
      addLog('DEBUG', args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      addLog('ERROR', [`Unhandled error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      addLog('ERROR', [`Unhandled promise rejection: ${event.reason}`]);
    });
  }

  function init() {
    if (isInitialized) return;

    loadLogs(() => {
      interceptConsole();
      isInitialized = true;
      console.log('Logger initialized with', logs.length, 'existing logs');
    });
  }

  function getLogs() {
    return logs;
  }

  function clearLogs() {
    logs = [];
    saveLogs();
    console.log('All logs cleared');
  }

  function downloadLogs() {
    const logText = logs.map(entry =>
      `[${entry.timestamp}] [${entry.level}] ${entry.message}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extension-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Logs downloaded');
  }

  function getLogsSummary() {
    const summary = {
      total: logs.length,
      errors: logs.filter(l => l.level === 'ERROR').length,
      warnings: logs.filter(l => l.level === 'WARN').length,
      info: logs.filter(l => l.level === 'INFO' || l.level === 'LOG').length
    };
    return summary;
  }

  return {
    init,
    getLogs,
    clearLogs,
    downloadLogs,
    getLogsSummary
  };
})();

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Logger.init());
} else {
  Logger.init();
}