class EventBus {
    constructor() {
        this._events = {};
    }

    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this._events[event]) return;
        this._events[event].forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error(`[EventBus] Error in handler for "${event}":`, e);
            }
        });
    }

    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

export const eventBus = new EventBus();