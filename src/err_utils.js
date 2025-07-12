const errors = [];

window.onerror = function(message, source, lineno, colno, error) {
    if(!manifest || !manifest?.name)  {  return false;  }
    errors.push({ message, source, lineno, colno, error });
    console.error(`>>> ${manifest?.name} - Error caught:`, message, error);
    return false; // Allow the event to bubble
};

window.addEventListener("error", function(event) {
    if(!manifest || !manifest?.name)  {  return false;  }
    errors.push({ message: event.message, source: event.filename, lineno: event.lineno, colno: event.colno, error: event.error });
    console.error(`>>> ${manifest?.name} - Error caught:`, event.message, event);
    return false;
});

window.addEventListener("unhandledrejection", function(event) {
    if(!manifest || !manifest?.name)  {  return false;  }
    errors.push({ message: event.reason });
    console.error(`>>> ${manifest?.name} - Unhandled rejection caught::`, event.reason);
    return false;
});
