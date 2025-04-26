document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    let conversationHistory = [{
        role: "system",
        content: "你是一位专业的Life Coach，你的目标是通过对话帮助用户实现个人成长。请以温暖、专业的态度与用户交流，提供有建设性的建议。"
    }];

    function addMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // 添加用户消息
        addMessage(message, true);
        userInput.value = '';

        // 更新对话历史
        conversationHistory.push({
            role: "user",
            content: message
        });

        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: conversationHistory
                })
            });

            const data = await response.json();
            
            // Add error checking for the response data
            if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from server');
            }
            
            // 添加AI回复
            const aiResponse = data.choices[0].message.content;
            addMessage(aiResponse, false);
            
            // 更新对话历史
            conversationHistory.push({
                role: "assistant",
                content: aiResponse
            });

        } catch (error) {
            console.error('Error:', error);
            addMessage('抱歉，发生了错误，请稍后重试。', false);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});