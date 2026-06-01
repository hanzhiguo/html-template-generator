export class SettingsPage {
    constructor() {
        if (window.app) {
            window.app.loadSettings();
            window.app.loadIcons();
        }
    }
}

new SettingsPage();