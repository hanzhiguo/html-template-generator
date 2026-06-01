import { showToast } from '../services/utils.js';
import { iconsAPI } from '../api/index.js';

class IconManager {
    constructor(getToken) {
        this.getToken = getToken;
        this.allIcons = [];
        this.selectedIcon = null;
    }

    switchSettingsSubTab(tab) {
        document.getElementById('settingsSystemSection').classList.toggle('hidden', tab !== 'system');
        document.getElementById('settingsIconsSection').classList.toggle('hidden', tab !== 'icons');
        document.getElementById('settingsSubTabSystem').className = tab === 'system' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
        document.getElementById('settingsSubTabIcons').className = tab === 'icons' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

        if (tab === 'icons' && this.allIcons.length === 0) {
            this.loadIcons();
            this.loadIconCategories();
        }
    }

    async loadIcons() {
        try {
            const data = await iconsAPI.getAll(this.getToken());
            this.allIcons = data.icons || [];
            this.renderIconsGrid(this.allIcons);
        } catch (err) {
            console.error('加载图标失败:', err);
            document.getElementById('iconsGrid').innerHTML = '<div style="grid-column:1/-1;text-center;color:#ef4444;padding:40px;">加载失败，请检查网络连接</div>';
        }
    }

    async loadIconCategories() {
        try {
            const data = await iconsAPI.getCategories(this.getToken());
            const select = document.getElementById('iconCategoryFilter');
            select.innerHTML = '<option value="">全部分类</option>';

            (data.categories || []).forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                select.appendChild(opt);
            });
        } catch (err) {
            console.error('加载分类失败:', err);
        }
    }

    renderIconsGrid(icons) {
        const grid = document.getElementById('iconsGrid');

        if (!icons.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px;">没有找到匹配的图标</div>';
            return;
        }

        grid.innerHTML = icons.map(icon => `
            <div class="icon-card" onclick="app.iconManager.selectIcon('${icon.id}')" style="background:#fff;border:2px solid ${this.selectedIcon === icon.id ? '#3b82f6' : '#e5e7eb'};border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all 0.2s ease;">
                <div style="width:64px;height:64px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-radius:8px;">
                    <img src="${icon.url}" alt="${icon.name}" style="width:48px;height:48px;" onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:24px;\\'>🎨</span>'">
                </div>
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;">${icon.name}</div>
                <div style="font-size:12px;color:#6b7280;">${icon.nameEn}</div>
                ${icon.tags && icon.tags.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin-top:8px;">${icon.tags.slice(0, 3).map(t => `<span style="font-size:10px;background:#eff6ff;color:#2563eb;padding:2px 6px;border-radius:4px;">${t}</span>`).join('')}</div>` : ''}
            </div>
        `).join('');
    }

    selectIcon(iconId) {
        this.selectedIcon = iconId;
        const icon = this.allIcons.find(i => i.id === iconId);

        if (!icon) return;

        const searchInput = document.getElementById('iconSearchInput');
        this.renderIconsGrid(
            searchInput && searchInput.value
                ? this.allIcons.filter(i => i.name.toLowerCase().includes(searchInput.value.toLowerCase()) || i.nameEn.toLowerCase().includes(searchInput.value.toLowerCase()))
                : this.allIcons
        );

        const panel = document.getElementById('iconDetailPanel');
        panel.style.display = 'block';

        document.getElementById('iconPreviewLarge').innerHTML = `<img src="${icon.url}" alt="${icon.name}" style="width:80px;height:80px;">`;
        document.getElementById('iconDetailName').textContent = icon.name;
        document.getElementById('iconDetailNameEn').textContent = icon.nameEn;
        document.getElementById('iconDetailDesc').textContent = icon.description || '';
        document.getElementById('iconDetailTags').innerHTML = (icon.tags || []).map(t =>
            `<span style="font-size:11px;background:#dbeafe;color:#1d4ed8;padding:4px 8px;border-radius:4px;">${t}</span>`
        ).join('');
    }

    searchIcons(query) {
        if (!query) {
            this.renderIconsGrid(this.allIcons);
            return;
        }
        const q = query.toLowerCase();
        const filtered = this.allIcons.filter(icon =>
            icon.name.toLowerCase().includes(q) ||
            icon.nameEn.toLowerCase().includes(q) ||
            (icon.tags && icon.tags.some(t => t.toLowerCase().includes(q)))
        );
        this.renderIconsGrid(filtered);
    }

    filterIconsByCategory(categoryId) {
        if (!categoryId) {
            this.renderIconsGrid(this.allIcons);
            document.getElementById('iconCategoryInfo').style.display = 'none';
            return;
        }

        const filtered = this.allIcons.filter(icon => icon.category === categoryId);
        this.renderIconsGrid(filtered);

        const catInfo = document.getElementById('iconCategoryInfo');
        catInfo.style.display = 'block';
        document.getElementById('iconCategoryName').textContent = filtered[0]?.category || categoryId;
    }

    copyIconCode() {
        if (!this.selectedIcon) return;
        const icon = this.allIcons.find(i => i.id === this.selectedIcon);
        const code = `{{icon:${icon?.category}:${this.selectedIcon}}}`;
        navigator.clipboard.writeText(code).then(() => {
            showToast('引用代码已复制到剪贴板');
        });
    }

    useIconInTemplate() {
        if (!this.selectedIcon) return;
        showToast(`图标 ${this.selectedIcon} 已准备用于模板`);
    }
}

export { IconManager };