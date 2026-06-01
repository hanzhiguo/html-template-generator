/**
 * 应用状态管理
 * 参考 Novel Board AI 的状态管理模式
 */

class AppState {
    constructor() {
        this.state = {
            user: null,
            token: null,
            products: [],
            currentProduct: null,
            currentTab: 'products',
            conversations: [],
            currentConversationId: null
        };
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // 用户相关
    setUser(user) {
        this.setState({ user });
    }

    setToken(token) {
        this.setState({ token });
    }

    logout() {
        this.setState({
            user: null,
            token: null,
            products: [],
            currentProduct: null
        });
    }

    // 产品相关
    setProducts(products) {
        this.setState({ products });
    }

    setCurrentProduct(product) {
        this.setState({ currentProduct: product });
    }

    addProduct(product) {
        const products = [...this.state.products, product];
        this.setState({ products });
    }

    updateProduct(id, updatedProduct) {
        const products = this.state.products.map(p => 
            p.id === id ? { ...p, ...updatedProduct } : p
        );
        this.setState({ products });
    }

    removeProduct(id) {
        const products = this.state.products.filter(p => p.id !== id);
        this.setState({ products });
    }

    // UI相关
    setCurrentTab(tab) {
        this.setState({ currentTab: tab });
    }

    // Agent相关
    setConversations(conversations) {
        this.setState({ conversations });
    }

    setCurrentConversationId(conversationId) {
        this.setState({ currentConversationId: conversationId });
    }
}

export const appState = new AppState();
window.appState = appState;
