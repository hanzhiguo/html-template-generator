/**
 * 主题管理服务
 * 支持浅色/深色主题切换
 */

export class ThemeManager {
  constructor() {
    // 默认使用浅色主题
    this.currentTheme = this.getStoredTheme() || 'light';
    this.init();
  }

  init() {
    // 应用存储的主题或系统主题
    this.applyTheme(this.currentTheme);
    
    // 监听系统主题变化
    this.watchSystemTheme();
    
    // 添加首次加载标记，避免过渡动画
    document.documentElement.classList.add('no-transition');
    setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 100);
  }

  getSystemTheme() {
    // 检测系统主题偏好
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  getStoredTheme() {
    // 从localStorage获取存储的主题
    return localStorage.getItem('theme');
  }

  setStoredTheme(theme) {
    // 存储主题到localStorage
    localStorage.setItem('theme', theme);
  }

  applyTheme(theme) {
    // 应用主题
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.setStoredTheme(theme);
    
    // 更新meta标签
    this.updateMetaThemeColor(theme);
    
    // 触发主题变化事件
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  updateMetaThemeColor(theme) {
    // 更移动端浏览器主题色
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.content = theme === 'light' ? '#ffffff' : '#0f172a';
  }

  toggle() {
    // 切换主题
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    return newTheme;
  }

  setTheme(theme) {
    // 设置指定主题
    if (theme === 'light' || theme === 'dark') {
      this.applyTheme(theme);
    }
  }

  watchSystemTheme() {
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // 只有在没有手动设置主题时才跟随系统
        if (!localStorage.getItem('theme')) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isLight() {
    return this.currentTheme === 'light';
  }

  isDark() {
    return this.currentTheme === 'dark';
  }
}

// 创建全局实例
export const themeManager = new ThemeManager();

// 导出便捷方法
export const toggleTheme = () => themeManager.toggle();
export const setTheme = (theme) => themeManager.setTheme(theme);
export const getCurrentTheme = () => themeManager.getCurrentTheme();
