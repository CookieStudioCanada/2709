const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve your existing static files

// Gemini API endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, appData } = req.body;
        
        // Create conversation history string
        const conversationContext = appData.chatHistory
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n\n');

        // Create a context-aware prompt with personality and history
        const contextPrompt = `
You are FileFlow AI, an intelligent assistant for professional file and task management. You help users organize their workflow, manage client files, and improve productivity.

Previous Conversation:
${conversationContext}

Current System State:

CLIENTS (${appData.clients.length}):
${appData.clients.map(client => `- ${client.name} (${client.email || 'No email'})`).join('\n')}

FILES (${appData.files.length}):
${appData.files.map(file => 
    `- ${file.name}
    Client: ${file.clientName}
    Status: ${file.status}
    Priority: ${file.priority}
    Due: ${file.dueDate || 'No due date'}
    Notes: ${file.notes || 'No notes'}
    Tasks: ${file.subTasks ? file.subTasks.map(task => 
        `\n      • ${task.description} (${task.completed ? 'Completed' : 'Pending'})`
    ).join('') : 'No tasks'}`
).join('\n\n')}

LINEUP (${appData.lineup.length} items):
${appData.lineup.map((fileId, index) => {
    const file = appData.files.find(f => f.id === fileId);
    return file ? `${index + 1}. ${file.name} (Client: ${file.clientName})` : null;
}).filter(Boolean).join('\n')}

When responding:
1. Use clear sections with **bold headers**
2. Use simple indentation for hierarchy
3. No bullet points or special characters
4. Keep content clean and organized
5. Use line breaks for separation

Example format:
**Section Title**

Main point
 - Sub point 1
 - Sub point 2

Another main point
 - Related sub point

Current User Question: ${prompt}

Please provide a helpful response based on the above information and our previous conversation, maintaining a professional and organized approach.`;

        console.log('Sending prompt to Gemini:', contextPrompt);

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(contextPrompt);
        const response = await result.response;
        const text = response.text();

        console.log('Gemini response:', text);

        res.json({ generated_text: text });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate content',
            details: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
