/**
 * 工具定义
 * 精简工具集：产品查询、知识库、文件读写
 */
const fs = require('fs').promises;
const path = require('path');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'query_products',
      description: '查询产品数据库，按关键词搜索产品信息。返回产品的基本信息、规格参数、卖点等。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，可以是产品名称、类别或描述'
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制',
            default: 10
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_kb',
      description: '搜索知识库中的文档内容。用于查找相关的文档、说明、FAQ等。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词'
          },
          limit: {
            type: 'number',
            description: '返回结果数量',
            default: 5
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取本地文件内容。支持读取 md、txt 等文本文件。',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件路径（相对于项目根目录）'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '写入内容到本地文件。如果文件存在则覆盖。',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件路径（相对于项目根目录）'
          },
          content: {
            type: 'string',
            description: '要写入的文件内容'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_attachments',
      description: '查询指定产品的所有附件（图片、文档、说明书、视频等），返回可直接访问的下载链接和文件信息。',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'number',
            description: '产品ID'
          },
          types: {
            type: 'string',
            description: '附件类型筛选：images（仅图片）、documents（仅文档）、all（全部），默认all',
            enum: ['images', 'documents', 'all']
          }
        },
        required: ['product_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_download_link',
      description: '获取指定附件的直接下载链接。返回完整的URL地址，用户可以直接点击下载。',
      parameters: {
        type: 'object',
        properties: {
          attachment_id: {
            type: 'number',
            description: '附件ID'
          },
          type: {
            type: 'string',
            description: '附件类型：image（图片）或 document（文档）',
            enum: ['image', 'document']
          }
        },
        required: ['attachment_id', 'type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_product',
      description: '创建完整的产品，包含基本信息、核心卖点、产品规格、包装清单、功能亮点、适配尺寸。支持批量添加产品数据。',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'number',
            description: '用户ID'
          },
          sku: {
            type: 'string',
            description: '产品SKU编号'
          },
          name: {
            type: 'string',
            description: '产品名称（必填）'
          },
          subtitle: {
            type: 'string',
            description: '产品副标题/简短描述'
          },
          description: {
            type: 'string',
            description: '产品详细描述'
          },
          price: {
            type: 'number',
            description: '产品价格'
          },
          currency: {
            type: 'string',
            description: '货币类型：USD/CNY/EUR，默认USD'
          },
          status: {
            type: 'string',
            description: '产品状态：draft/active/archived，默认draft'
          },
          highlights: {
            type: 'array',
            description: '核心卖点列表，每项包含key和value',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: '卖点属性名' },
                value: { type: 'string', description: '卖点属性值' }
              }
            }
          },
          specs: {
            type: 'array',
            description: '产品规格列表，每项包含label、value、unit',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: '规格名称' },
                value: { type: 'string', description: '规格值' },
                unit: { type: 'string', description: '单位' }
              }
            }
          },
          accessories: {
            type: 'array',
            description: '包装清单列表，每项包含name和quantity',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '配件名称' },
                quantity: { type: 'number', description: '数量，默认1' }
              }
            }
          },
          features: {
            type: 'array',
            description: '功能亮点列表，每项包含title、description',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '功能标题' },
                description: { type: 'string', description: '功能描述' }
              }
            }
          },
          dimensions: {
            type: 'array',
            description: '适配尺寸列表，每项包含label、value、unit',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: '尺寸名称' },
                value: { type: 'string', description: '尺寸值' },
                unit: { type: 'string', description: '单位' }
              }
            }
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recognize_image_text',
      description: '使用视觉模型识别图片中的所有文字。传入图片的base64编码，返回图片中提取的所有文字内容。',
      parameters: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            description: '图片的base64编码字符串（不含前缀，如 "data:image/jpeg;base64,..." 中的逗号后部分）'
          }
        },
        required: ['image']
      }
    }
  }
];

module.exports = { definitions };
