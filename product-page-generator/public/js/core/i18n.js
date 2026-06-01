const i18nData = {
    zh: {
        'features': '功能亮点',
        'specifications': '产品规格',
        'dimensions': '适配尺寸',
        'package-includes': '包装清单',
        'key-highlights': '核心卖点',
        'preview-title': '产品详情预览'
    },
    en: {
        'features': 'FEATURES',
        'specifications': 'SPECIFICATIONS',
        'dimensions': 'DIMENSIONS',
        'package-includes': 'PACKAGE INCLUDES',
        'key-highlights': 'KEY HIGHLIGHTS',
        'preview-title': 'Product Preview'
    },
    ja: {
        'features': '機能',
        'specifications': '仕様',
        'dimensions': '寸法',
        'package-includes': 'パッケージ内容',
        'key-highlights': '主な特徴',
        'preview-title': '製品プレビュー'
    },
    de: {
        'features': 'FUNKTIONEN',
        'specifications': 'SPEZIFIKATIONEN',
        'dimensions': 'ABMESSUNGEN',
        'package-includes': 'LIEFERUMFANG',
        'key-highlights': 'HAUPTEIGENSCHAFTEN',
        'preview-title': 'Produktvorschau'
    },
    fr: {
        'features': 'CARACTÉRISTIQUES',
        'specifications': 'SPÉCIFICATIONS',
        'dimensions': 'DIMENSIONS',
        'package-includes': 'CONTENU DU PAQUET',
        'key-highlights': 'POINTS FORTS',
        'preview-title': 'Aperçu du produit'
    },
    es: {
        'features': 'CARACTERÍSTICAS',
        'specifications': 'ESPECIFICACIONES',
        'dimensions': 'DIMENSIONES',
        'package-includes': 'CONTENIDO DEL PAQUETE',
        'key-highlights': 'CARACTERÍSTICAS PRINCIPALES',
        'preview-title': 'Vista previa del producto'
    },
    ko: {
        'features': '기능',
        'specifications': '사양',
        'dimensions': '치수',
        'package-includes': '패키지 포함',
        'key-highlights': '주요 특징',
        'preview-title': '제품 미리보기'
    },
    ru: {
        'features': 'ОСОБЕННОСТИ',
        'specifications': 'ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ',
        'dimensions': 'РАЗМЕРЫ',
        'package-includes': 'КОМПЛЕКТАЦИЯ',
        'key-highlights': 'КЛЮЧЕВЫЕ ОСОБЕННОСТИ',
        'preview-title': 'Предпросмотр продукта'
    }
};

export function t(lang, key) {
    return i18nData[lang]?.[key] || i18nData['en'][key] || key;
}

export { i18nData };