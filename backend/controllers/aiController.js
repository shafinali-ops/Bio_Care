const Groq = require('groq-sdk');
const SymptomCheck = require('../models/symptomCheck');
const Patient = require('../models/patient');


const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// AI Symptom Checker Controller using Groq
exports.analyzeSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms || symptoms.length === 0) {
            return res.status(400).json({ message: 'Please provide at least one symptom' });
        }

        // Create a detailed prompt for Groq
        const prompt = `You are a medical AI assistant. Analyze the following symptoms and provide a comprehensive medical assessment in JSON format.

Symptoms: ${symptoms.join(', ')}

Please provide a response in the following JSON structure (return ONLY valid JSON, no markdown or code blocks):
{
  "input_symptoms": ${JSON.stringify(symptoms)},
  "symptom_severity_analysis": {
    // For each symptom, rate as "mild", "moderate", or "severe"
  },
  "possible_conditions": [
    {
      "name": "condition name",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "triage_level": "low" | "medium" | "high" | "critical",
  "urgency_category": "routine-care" | "urgent-care" | "emergency",
  "is_emergency": false,
  "home_care_advice": [
    "advice 1",
    "advice 2"
  ],
  "avoid_these": [
    "thing to avoid 1",
    "thing to avoid 2"
  ],
  "recommended_otc_medicines": [
    {
      "name": "medicine name",
      "dosage_note": "dosage instructions"
    }
  ],
  "warning_signs_to_monitor": [
    "warning sign 1",
    "warning sign 2"
  ],
  "when_to_visit_doctor": [
    "condition 1",
    "condition 2"
  ],
  "recommendation": "Overall recommendation summary",
  "urgency_statement": "Clear statement about the urgency of the situation and what action to take",
  "consult_doctor_immediately": true | false
}

Important: Return ONLY the JSON object, no additional text or formatting.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a medical AI assistant that provides symptom analysis. Always respond with valid JSON only, no markdown formatting or code blocks.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 2048,
        });

        let responseText = chatCompletion.choices[0]?.message?.content || '';

        // Clean up the response - remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse the JSON response
        const diagnosis = JSON.parse(responseText);

        // Save to database if user is authenticated
        if (req.user && req.user.id) {
            try {
                // Find the patient record for this user
                const patient = await Patient.findOne({ userId: req.user.id });

                if (patient) {
                    // Create symptom check record
                    const symptomCheckData = {
                        patientId: patient._id,
                        userId: req.user.id,
                        input_symptoms: diagnosis.input_symptoms,
                        symptom_severity_analysis: diagnosis.symptom_severity_analysis,
                        possible_conditions: diagnosis.possible_conditions,
                        triage_level: diagnosis.triage_level,
                        urgency_category: diagnosis.urgency_category,
                        is_emergency: diagnosis.is_emergency,
                        home_care_advice: diagnosis.home_care_advice,
                        avoid_these: diagnosis.avoid_these,
                        recommended_otc_medicines: diagnosis.recommended_otc_medicines,
                        warning_signs_to_monitor: diagnosis.warning_signs_to_monitor,
                        when_to_visit_doctor: diagnosis.when_to_visit_doctor,
                        recommendation: diagnosis.recommendation,
                        urgency_statement: diagnosis.urgency_statement,
                        consult_doctor_immediately: diagnosis.consult_doctor_immediately
                    };

                    const symptomCheck = new SymptomCheck(symptomCheckData);
                    await symptomCheck.save();

                    console.log('Symptom check saved to database for patient:', patient._id);
                }
            } catch (dbError) {
                console.error('Error saving symptom check to database:', dbError);
                // Don't fail the request if database save fails
            }
        }

        res.json(diagnosis);
    } catch (error) {
        console.error('Groq API Error:', error);

        // Fallback response if Groq fails
        const fallbackResponse = {
            input_symptoms: req.body.symptoms || [],
            symptom_severity_analysis: req.body.symptoms?.reduce((acc, symptom) => {
                acc[symptom] = 'moderate';
                return acc;
            }, {}) || {},
            possible_conditions: [
                {
                    name: 'Common viral infection',
                    confidence: 'medium'
                }
            ],
            triage_level: 'low',
            urgency_category: 'routine-care',
            is_emergency: false,
            home_care_advice: [
                'Rest and stay hydrated',
                'Monitor your symptoms',
                'Take over-the-counter medication if needed'
            ],
            avoid_these: [
                'Avoid self-medication with antibiotics',
                'Avoid strenuous activities'
            ],
            recommended_otc_medicines: [
                {
                    name: 'Paracetamol',
                    dosage_note: 'Follow package instructions for fever and pain relief'
                }
            ],
            warning_signs_to_monitor: [
                'High fever persisting more than 3 days',
                'Difficulty breathing',
                'Severe pain'
            ],
            when_to_visit_doctor: [
                'If symptoms worsen or persist beyond 3-5 days',
                'If you develop new concerning symptoms'
            ],
            recommendation: 'Monitor your symptoms and seek medical attention if they worsen. This is a general assessment and not a substitute for professional medical advice.',
            urgency_statement: 'Your symptoms appear to be mild. Continue monitoring and seek medical care if they worsen.',
            consult_doctor_immediately: false
        };

        res.json(fallbackResponse);
    }
};

exports.getUrgencyAssessment = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms || symptoms.length === 0) {
            return res.status(400).json({ message: 'Please provide at least one symptom' });
        }

        // Create urgency assessment prompt
        const prompt = `Based on these symptoms: ${symptoms.join(', ')}
    
Provide an urgency assessment in JSON format (return ONLY valid JSON):
{
  "level": "low" | "medium" | "high" | "critical",
  "message": "detailed message about urgency"
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a medical triage AI. Assess urgency levels based on symptoms. Respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 256,
        });

        let responseText = chatCompletion.choices[0]?.message?.content || '';
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const urgencyAssessment = JSON.parse(responseText);

        res.json(urgencyAssessment);
    } catch (error) {
        console.error('Groq API Error:', error);

        // Fallback urgency assessment
        res.json({
            level: 'medium',
            message: 'Please monitor your symptoms. Consider consulting a healthcare provider if symptoms persist or worsen.'
        });
    }
};

// Get symptom check history for the authenticated patient
exports.getSymptomHistory = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find the patient record for this user
        const patient = await Patient.findOne({ userId: req.user.id });

        if (!patient) {
            return res.status(404).json({ message: 'Patient record not found' });
        }

        // Get all symptom checks for this patient, sorted by most recent first
        const symptomHistory = await SymptomCheck.find({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 checks

        res.json({
            success: true,
            count: symptomHistory.length,
            data: symptomHistory
        });
    } catch (error) {
        console.error('Error fetching symptom history:', error);
        res.status(500).json({ message: 'Failed to fetch symptom history', error: error.message });
    }
};

// Get a specific symptom check by ID
exports.getSymptomCheckById = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;

        // Find the symptom check
        const symptomCheck = await SymptomCheck.findById(id)
            .populate('patientId', 'name age gender')
            .populate('userId', 'email');

        if (!symptomCheck) {
            return res.status(404).json({ message: 'Symptom check not found' });
        }

        // Verify that this symptom check belongs to the authenticated user
        if (symptomCheck.userId._id.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            success: true,
            data: symptomCheck
        });
    } catch (error) {
        console.error('Error fetching symptom check:', error);
        res.status(500).json({ message: 'Failed to fetch symptom check', error: error.message });
    }
};

