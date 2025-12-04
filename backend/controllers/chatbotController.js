const OpenAI = require('openai');
const Groq = require('groq-sdk');
const ChatMessage = require('../models/chatMessage');
const Patient = require('../models/patient');
const { storeContext, retrieveContext } = require('../services/pineconeService');
const { processFile, cleanExtractedText } = require('../services/fileProcessingService');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Initialize OpenAI client (fallback/TTS)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// System prompt for the medical AI chatbot
const SYSTEM_PROMPT = `
You are an expert, medically-safe, empathetic AI assistant for a professional healthcare platform.  
Your role is to guide patients with safe triage, symptom explanation, and structured medical reasoning.  
You MUST always follow medical safety rules.

=========================
### CORE CAPABILITIES
=========================
1. Understand and respond in both **English** and **Urdu (اردو)** automatically based on user input.
2. Analyze:
   - Patient symptoms (text)
   - Detailed descriptions
   - Medical reports (PDF, DOC, images → OCR text)
   - Lab values with reference ranges
   - Past session context (multi-session memory)
3. Provide **deep explanations**, including:
   - Why a symptom occurs (e.g., “Why does head pain happen?”)
   - What body systems are involved
   - Risk factor analysis
   - Possible causes explained in simple language
   - How serious the issue may be
   - Impact on daily life
   - What the patient should do next
4. Ask clarifying questions when medical info is incomplete.
5. NEVER prescribe prescription drugs, NEVER give definitive diagnosis.
6. Use a supportive, respectful, comforting medical tone at all times.

=============================
### EXPLANATION REQUIREMENTS
=============================
All responses must:
- Break down complex medical terms into **simple patient-friendly language**.
- Explain **WHY** each condition is suspected.
- Explain **HOW** symptoms are connected.
- Provide **detailed self-care**, lifestyle guidance, and prevention.
- Add **appointment reminders** and **follow-up guidance**.
- Give strong **red flag warnings** when needed.
- Maintain a warm, empathetic tone similar to a real doctor.

======================
### JSON OUTPUT RULES
======================
Always respond with **pure valid JSON only** (no markdown).

Use this exact structure:

{
  "patient_query": "summary of what patient asked",
  "language_detected": "en or ur",

  "symptoms_detected": ["symptom1", "symptom2"],
  "symptom_explanations": {
    "symptom1": "why this symptom occurs, simple detailed explanation",
    "symptom2": "cause and physiology explained simply"
  },

  "report_summary": "summary if medical report or image was provided",
  "risk_factors_detected": ["risk1", "risk2"],
  "lifestyle_factors": ["factor1", "factor2"],

  "possible_conditions": [
    {
      "name": "condition name",
      "confidence": "low/medium/high",
      "why_suspected": "detailed reasoning based on symptoms",
      "explanation": "comprehensive explanation of what this condition is and how it affects the body"
    }
  ],

  "triage_level": "low/medium/high/critical",
  "urgency_category": "routine-care/urgent-care/emergency",
  "is_emergency": false,

  "home_care_advice": [
    "detailed advice 1 - explain WHY this helps and HOW to do it properly",
    "detailed advice 2 - step-by-step instructions",
    "detailed advice 3 - additional relief measure"
  ],

  "avoid_these": [
    "thing to avoid 1 - explanation of why it worsens the condition",
    "thing to avoid 2 - explanation of why",
    "thing to avoid 3 - dietary or lifestyle restriction",
    "thing to avoid 4 - activity restriction"
  ],

  "recommended_otc_medicines": [
    {
      "name": "OTC medicine",
      "dosage_note": "safe general dosage guidance"
    }
  ],

  "warning_signs_to_monitor": [
    "symptom or change that requires urgent attention"
  ],

  "when_to_visit_doctor": [
    "conditions under which they should see doctor",
    "time estimates like 24 hours, 2–3 days etc."
  ],

  "daily_life_impact": [
    "how condition affects energy, sleep, work, mood etc."
  ],

  "health_tips": [
    "long-term prevention tip 1",
    "lifestyle improvement tip 2"
  ],

  "appointment_reminder": {
    "suggested_follow_up": "e.g., 'If symptoms do not improve in 3 days, schedule a medical appointment.'",
    "type": "routine or urgent",
    "reason": "why follow-up is important"
  },

  "recommendation": "overall summary recommendation",
  "urgency_statement": "clear urgency assessment",
  "consult_doctor_immediately": false,

  "response_text": "A detailed, empathetic, human-like medical explanation in natural language. \nExplain causes, probabilities, physiology, what it means for the patient, what to do next, \nwhy each step matters, and provide reassurance. Include emotional support and clarity."
}

IMPORTANT RULES:
- Return **ONLY** valid JSON.
- NO markdown, NO code blocks.
- NO breaking the JSON structure.
`;

// Send message to chatbot
exports.sendMessage = async (req, res) => {
    try {
        const { message, sessionId, language = 'auto' } = req.body;
        const userId = req.user.id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get or create session ID
        const currentSessionId = sessionId || uuidv4();

        // Find patient record
        const patient = await Patient.findOne({ userId });

        // Retrieve relevant context from Pinecone
        // Note: This might return empty if embedding generation fails (handled in service)
        const contextMatches = await retrieveContext(userId, message, 5);
        const contextText = contextMatches
            .map(match => match.metadata?.text || '')
            .filter(text => text)
            .join('\n\n');

        // Get recent conversation history
        const recentMessages = await ChatMessage.find({
            userId,
            sessionId: currentSessionId
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Build conversation messages
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // Add context if available
        if (contextText) {
            messages.push({
                role: 'system',
                content: `Previous conversation context:\n${contextText}`
            });
        }

        // Add recent conversation history (in reverse order)
        recentMessages.reverse().forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });

        // Add current user message
        messages.push({
            role: 'user',
            content: `Patient input:\n${message}`
        });

        // Call Groq API instead of OpenAI
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        });

        let aiResponseText = completion.choices[0]?.message?.content || '';

        // Clean up response - remove markdown code blocks if present
        aiResponseText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse AI response
        let aiResponse;
        try {
            aiResponse = JSON.parse(aiResponseText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', aiResponseText);
            // Fallback response
            aiResponse = {
                patient_query: message,
                language_detected: language,
                response_text: aiResponseText,
                recommendation: 'Please consult with a healthcare professional for personalized advice.'
            };
        }

        // Save user message
        const userMessage = new ChatMessage({
            userId,
            patientId: patient?._id,
            sessionId: currentSessionId,
            role: 'user',
            content: message,
            messageType: 'text',
            language: aiResponse.language_detected || language
        });
        await userMessage.save();

        // Store user message context in Pinecone (will skip if quota exceeded)
        await storeContext(userId, currentSessionId, userMessage._id, message, {
            role: 'user',
            language: aiResponse.language_detected || language
        });

        // Save assistant response
        const assistantMessage = new ChatMessage({
            userId,
            patientId: patient?._id,
            sessionId: currentSessionId,
            role: 'assistant',
            content: aiResponse.response_text || JSON.stringify(aiResponse),
            messageType: 'text',
            language: aiResponse.language_detected || language,
            aiResponse
        });
        await assistantMessage.save();

        // Store assistant response context in Pinecone
        await storeContext(
            userId,
            currentSessionId,
            assistantMessage._id,
            aiResponse.response_text || JSON.stringify(aiResponse),
            {
                role: 'assistant',
                language: aiResponse.language_detected || language,
                symptoms: aiResponse.symptoms_detected,
                triage_level: aiResponse.triage_level
            }
        );

        res.json({
            success: true,
            sessionId: currentSessionId,
            message: assistantMessage,
            aiResponse
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
};

// Upload and process file (PDF, DOC, Image)
exports.uploadFile = async (req, res) => {
    try {
        const { sessionId, additionalMessage } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileType = req.file.mimetype;

        // Extract text from file
        console.log('Processing file:', fileName);
        const extractedText = await processFile(filePath, fileType);
        const cleanedText = cleanExtractedText(extractedText);

        console.log('Extracted text length:', cleanedText.length);

        // Get or create session ID
        const currentSessionId = sessionId || uuidv4();

        // Find patient record
        const patient = await Patient.findOne({ userId });

        // Prepare message for AI
        const userMessage = additionalMessage
            ? `${additionalMessage}\n\nMedical Report/Document:\n${cleanedText}`
            : `Please analyze this medical report/document:\n${cleanedText}`;

        // Get recent conversation history
        const recentMessages = await ChatMessage.find({
            userId,
            sessionId: currentSessionId
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Build messages
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // Add recent history
        recentMessages.reverse().forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });

        // Add current message with file content
        messages.push({
            role: 'user',
            content: userMessage
        });

        // Call Groq API
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        });

        let aiResponseText = completion.choices[0]?.message?.content || '';
        aiResponseText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse AI response
        let aiResponse;
        try {
            aiResponse = JSON.parse(aiResponseText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', aiResponseText);
            aiResponse = {
                patient_query: 'File analysis',
                response_text: aiResponseText,
                report_summary: cleanedText.substring(0, 500) + '...'
            };
        }

        // Save user message with file attachment
        const userChatMessage = new ChatMessage({
            userId,
            patientId: patient?._id,
            sessionId: currentSessionId,
            role: 'user',
            content: additionalMessage || 'Uploaded medical document',
            messageType: 'file',
            attachments: [{
                filename: fileName,
                filepath: filePath,
                fileType,
                extractedText: cleanedText
            }]
        });
        await userChatMessage.save();

        // Store in Pinecone
        await storeContext(userId, currentSessionId, userChatMessage._id, cleanedText, {
            role: 'user',
            type: 'file',
            filename: fileName
        });

        // Save assistant response
        const assistantMessage = new ChatMessage({
            userId,
            patientId: patient?._id,
            sessionId: currentSessionId,
            role: 'assistant',
            content: aiResponse.response_text || JSON.stringify(aiResponse),
            messageType: 'text',
            aiResponse
        });
        await assistantMessage.save();

        // Store assistant response in Pinecone
        await storeContext(
            userId,
            currentSessionId,
            assistantMessage._id,
            aiResponse.response_text || JSON.stringify(aiResponse),
            {
                role: 'assistant',
                type: 'file_analysis'
            }
        );

        res.json({
            success: true,
            sessionId: currentSessionId,
            extractedText: cleanedText.substring(0, 1000) + (cleanedText.length > 1000 ? '...' : ''),
            message: assistantMessage,
            aiResponse
        });

    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            error: 'Failed to process file',
            details: error.message
        });
    }
};

// Transcribe voice message using Groq Whisper
exports.transcribeVoice = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const audioPath = req.file.path;

        // Transcribe audio using Groq Whisper
        const transcription = await groq.audio.transcriptions.create({
            file: require('fs').createReadStream(audioPath),
            model: 'distil-whisper-large-v3-en', // Groq's Whisper model
            language: 'en' // Can detect Urdu as well if supported by model, or auto-detect
        });

        const transcribedText = transcription.text;

        res.json({
            success: true,
            transcription: transcribedText,
            sessionId: sessionId || uuidv4()
        });

    } catch (error) {
        console.error('Voice transcription error:', error);
        res.status(500).json({
            error: 'Failed to transcribe voice',
            details: error.message
        });
    }
};

// Get chat history
exports.getChatHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const messages = await ChatMessage.find({
            userId,
            sessionId
        })
            .sort({ createdAt: 1 })
            .lean();

        res.json({
            success: true,
            sessionId,
            messages
        });

    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            error: 'Failed to fetch chat history',
            details: error.message
        });
    }
};

// Get all sessions for user
exports.getSessions = async (req, res) => {
    try {
        const userId = req.user.id;

        const sessions = await ChatMessage.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Fixed ObjectId error
            {
                $group: {
                    _id: '$sessionId',
                    lastMessage: { $last: '$content' },
                    lastMessageTime: { $last: '$createdAt' },
                    messageCount: { $sum: 1 }
                }
            },
            { $sort: { lastMessageTime: -1 } },
            { $limit: 50 }
        ]);

        res.json({
            success: true,
            sessions
        });

    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
            error: 'Failed to fetch sessions',
            details: error.message
        });
    }
};

// Text-to-speech (OpenAI - might fail if quota exceeded)
exports.textToSpeech = async (req, res) => {
    try {
        const { text, voice = 'alloy' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice,
            input: text
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length
        });

        res.send(buffer);

    } catch (error) {
        console.error('Text-to-speech error:', error);
        res.status(500).json({
            error: 'Failed to generate speech (Quota exceeded or other error)',
            details: error.message
        });
    }
};

// Legacy endpoints for backward compatibility
exports.sendQuery = async (req, res) => {
    // Redirect to new sendMessage endpoint
    req.body.message = req.body.query;
    return exports.sendMessage(req, res);
};

exports.getHealthTips = async (req, res) => {
    try {
        const tips = [
            'Maintain a balanced diet with plenty of fruits and vegetables',
            'Exercise regularly for at least 30 minutes a day',
            'Get 7-9 hours of sleep each night',
            'Stay hydrated by drinking plenty of water',
            'Manage stress through relaxation techniques'
        ];
        res.json(tips);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.recommendMedication = async (req, res) => {
    try {
        const medications = [
            {
                name: 'General Pain Relief',
                dosage: 'As per doctor\'s prescription',
                frequency: 'Consult doctor',
                pharmacy: 'Available at all pharmacies',
                price: 'Varies'
            }
        ];
        res.json(medications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
