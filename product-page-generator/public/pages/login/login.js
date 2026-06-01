/**
 * 登录页面事件处理
 * 登录的核心逻辑在 AppBase.handleLogin 中
 * 这个文件处理额外的登录页面交互
 */

export class LoginPage {
    constructor() {
        // 检查是否已经初始化，避免重复绑定
        if (document.getElementById('loginForm')?.dataset.initialized) return;
        this._bindEvents();
    }

    _bindEvents() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            // 不要 preventDefault！让 AppBase.handleLogin 处理
            const username = document.getElementById('loginUsername')?.value;
            console.log('[LoginPage] 表单提交，username:', username);
        });
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});