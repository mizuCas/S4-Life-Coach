const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API 配置 - 使用环境变量
const API_KEY = process.env.VOLC_API_KEY;
const API_URL = process.env.VOLC_API_URL;

// 存储用户会话数据
const sessions = new Map();

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const sessionId = req.body.sessionId || 'default';
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                messages: [],
                mood: 'neutral',
                analysis: {}
            });
        }

        const session = sessions.get(sessionId);
        const userMessage = req.body.messages[req.body.messages.length - 1];
        
        // 分析用户心情
        const moodAnalysisMessages = [
            { role: "system", content: "请分析用户的情绪状态，只返回一个词：happy, sad, angry, neutral, excited" },
            { role: "user", content: userMessage.content }
        ];

        const moodResponse = await axios({
            method: 'post',
            url: API_URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            data: {
                model: "deepseek-r1-250120",
                messages: moodAnalysisMessages,
                stream: false,
                temperature: 0.2
            }
        });

        session.mood = moodResponse.data.choices[0].message.content.trim().toLowerCase();

        // 获取AI回复
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
                stream: false,
                temperature: 0.6
            },
            timeout: 60000,
            responseType: 'json'
        });

        // 更新会话历史
        session.messages.push(userMessage);
        session.messages.push({
            role: "assistant",
            content: apiResponse.data.choices[0].message.content
        });

        // 如果对话超过5轮，进行整体分析
        if (session.messages.length >= 10) {
            const analysisMessages = [
                { 
                    role: "system", 
                    content: "请分析这段对话的主要问题、用户的核心诉求和情绪变化，给出简要总结。" 
                },
                {
                    role: "user",
                    content: JSON.stringify(session.messages)
                }
            ];

            const analysisResponse = await axios({
                method: 'post',
                url: API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'application/json'
                },
                data: {
                    model: "deepseek-r1-250120",
                    messages: analysisMessages,
                    stream: false,
                    temperature: 0.3
                }
            });

            session.analysis = {
                timestamp: new Date().toISOString(),
                content: analysisResponse.data.choices[0].message.content
            };
        }

        // 返回响应
        const formattedResponse = {
            choices: [{
                message: {
                    content: apiResponse.data.choices[0].message.content
                }
            }],
            mood: session.mood,
            analysis: session.analysis
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