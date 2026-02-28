export function createAppController({ eventBus = new EventTarget() } = {}) {
  function emit(eventName, detail) {
    eventBus.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function on(eventName, listener) {
    eventBus.addEventListener(eventName, listener);
    return () => {
      eventBus.removeEventListener(eventName, listener);
    };
  }

  return {
    emit,
    on
  };
}
