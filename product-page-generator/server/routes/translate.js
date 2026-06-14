const express = require('express');
const router = express.Router();
const agentConfig = require('../agent/config');

const langNames = {
    'zh': 'Chinese',
    'en': 'English',
    'ja': 'Japanese',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'ko': 'Korean',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian',
    'ar': 'Arabic',
    'th': 'Thai',
    'vi': 'Vietnamese'
};

router.post('/translate', async (req, res) => {
    const { content, targetLang, sourceLang = 'zh' } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: '缺少翻译内容' });
    }

    if (!targetLang) {
        return res.status(400).json({ error: '缺少目标语言' });
    }

    if (targetLang === sourceLang) {
        return res.json({ translated: content });
    }

    try {
        const translated = await translateWithAI(content, targetLang, sourceLang);
        res.json({ translated });
    } catch (err) {
        console.error('翻译失败:', err);
        res.status(500).json({ error: err.message || '翻译失败' });
    }
});

async function translateWithAI(content, targetLang, sourceLang) {
    const provider = agentConfig.defaultProvider || 'ollama';
    const ollamaConfig = agentConfig.providers.ollama;
    const model = ollamaConfig.model || 'gemma3:4b';
    const baseUrl = ollamaConfig.baseUrl.replace('/v1', '') || 'http://localhost:11434';
    const apiKey = agentConfig.providers.deepseek?.apiKey || '';

    const sourceLangName = langNames[sourceLang] || sourceLang;
    const targetLangName = langNames[targetLang] || targetLang;

    const prompt = `You are a professional product translator. Translate the following product information from ${sourceLangName} to ${targetLangName}.

IMPORTANT RULES:
1. Keep all JSON structure unchanged
2. Only translate text values, keep keys unchanged
3. Keep numbers, units, and technical terms unchanged
4. Keep brand names and model numbers unchanged
5. Return ONLY the translated JSON, no explanations or markdown

Input JSON:
${JSON.stringify(content, null, 2)}

Translated JSON:`;

    try {
        if (provider === 'ollama') {
            return await translateWithOllama(baseUrl, model, prompt);
        } else if (provider === 'openai') {
            return await translateWithOpenAI(apiKey, model, prompt);
        } else {
            throw new Error('不支持的AI提供商: ' + provider);
        }
    } catch (err) {
        throw err;
    }
}

async function translateWithOllama(baseUrl, model, prompt) {
    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.3
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama API错误: ${response.status}`);
    }

    const data = await response.json();
    let translated = data.response || '';
    
    const jsonMatch = translated.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error('JSON解析失败:', e);
            throw new Error('翻译结果JSON解析失败');
        }
    }
    
    throw new Error('翻译结果格式错误');
}

async function translateWithOpenAI(apiKey, model, prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model || 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API错误: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    let translated = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = translated.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error('翻译结果JSON解析失败');
        }
    }
    
    throw new Error('翻译结果格式错误');
}

module.exports = router;

// 简单中译英接口（无需认证）
router.post('/zh2en', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '缺少文本' });

    try {
        const ollamaConfig = agentConfig.providers.ollama;
        const model = ollamaConfig.model || 'gemma3:4b';
        const baseUrl = ollamaConfig.baseUrl.replace('/v1', '') || 'http://localhost:11434';

        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: `Translate the following Chinese text to one English word (noun). Only return the English word, nothing else:\n${text}`,
                stream: false,
                options: { temperature: 0.1 }
            })
        });

        if (!response.ok) throw new Error(`Ollama错误: ${response.status}`);
        const data = await response.json();
        const word = (data.response || '').trim().split(/[\s,，]+/)[0].toLowerCase();
        res.json({ translated: word });
    } catch (err) {
        console.error('中译英失败:', err);
        res.status(500).json({ error: err.message });
    }
});
