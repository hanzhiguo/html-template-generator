import { settingsAPI } from '../api/index.js';

class SettingsManager {
    constructor(getToken) {
        this.getToken = getToken;
    }

    async loadSettings() {
        try {
            const config = await settingsAPI.getConfig(this.getToken());

            if (config.defaultProvider) {
                document.getElementById('defaultProvider').value = config.defaultProvider;
                this.onProviderChange();
            }

            if (config.providers && config.providers.ollama) {
                document.getElementById('ollamaBaseUrl').value = config.providers.ollama.baseUrl || '';
                this.setOllamaModel(config.providers.ollama.model || 'gemma4:e4b');
            }

            if (config.providers && config.providers.deepseek) {
                document.getElementById('deepseekModel').value = config.providers.deepseek.model || 'deepseek-chat';
            }

            if (config.providers && config.providers.zhipu) {
                document.getElementById('zhipuModel').value = config.providers.zhipu.model || 'glm-4-flash';
            }

            if (config.maxIterations) {
                document.getElementById('maxIterations').value = config.maxIterations;
            }
            if (config.maxTokens) {
                document.getElementById('maxTokens').value = config.maxTokens;
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    onProviderChange() {
        const provider = document.getElementById('defaultProvider').value;

        document.getElementById('ollamaConfig').style.display = 'none';
        document.getElementById('deepseekConfig').style.display = 'none';
        document.getElementById('zhipuConfig').style.display = 'none';

        document.getElementById(provider + 'Config').style.display = 'block';
    }

    toggleCustomModel() {
        const useCustom = document.getElementById('useCustomModel').checked;
        document.getElementById('ollamaModelPreset').style.display = useCustom ? 'none' : 'block';
        document.getElementById('ollamaModelCustom').style.display = useCustom ? 'block' : 'none';
    }

    getOllamaModel() {
        const useCustom = document.getElementById('useCustomModel').checked;
        return useCustom
            ? document.getElementById('ollamaModelCustom').value
            : document.getElementById('ollamaModelPreset').value;
    }

    setOllamaModel(modelName) {
        const presetSelect = document.getElementById('ollamaModelPreset');
        const customInput = document.getElementById('ollamaModelCustom');
        const useCustomCheckbox = document.getElementById('useCustomModel');

        const presetOption = Array.from(presetSelect.options).find(opt => opt.value === modelName);

        if (presetOption) {
            presetSelect.value = modelName;
            useCustomCheckbox.checked = false;
            this.toggleCustomModel();
        } else {
            customInput.value = modelName;
            useCustomCheckbox.checked = true;
            this.toggleCustomModel();
        }
    }
}

export { SettingsManager };