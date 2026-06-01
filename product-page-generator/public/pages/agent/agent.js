export class AgentPage {
    constructor() {
        if (window.app) {
            window.app.loadAgentTools();
            window.app.loadKBStats();
            window.app.loadConversations();
        }
    }
}

new AgentPage();