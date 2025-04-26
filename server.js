const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();  // 添加这行来加载环境变量
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API 配置 - 使用环境变量
const API_KEY = process.env.VOLC_API_KEY;
const API_URL = process.env.VOLC_API_URL;

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const apiResponse = await axios({
            method: 'post',
            url: API_URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            data: {
                model: "deepseek-r1-250120",
                messages: req.body.messages,
                stream: false,  // 暂时关闭流式输出
                temperature: 0.6
            },
            timeout: 60000,
            responseType: 'json'
        });

        // 检查响应数据格式
        if (!apiResponse.data) {
            throw new Error('API 响应为空');
        }

        // 确保响应格式符合客户端期望
        const formattedResponse = {
            choices: [{
                message: {
                    content: apiResponse.data.choices?.[0]?.message?.content || '抱歉，AI 响应格式异常'
                }
            }]
        };

        res.json(formattedResponse);
    } catch (error) {
        console.error('API 错误:', error.response?.data || error.message);
        res.status(500).json({
            error: '服务器错误',
            details: error.response?.data || error.message
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});