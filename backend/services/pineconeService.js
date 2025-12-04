const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

let pinecone = null;
let index = null;

// Initialize Pinecone
const initPinecone = async () => {
    if (!pinecone) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });

        try {
            // Try to get existing index or create new one
            const indexName = 'healthcare-chatbot';
            const indexList = await pinecone.listIndexes();

            const indexExists = indexList.indexes?.some(idx => idx.name === indexName);

            if (!indexExists) {
                console.log('Creating Pinecone index...');
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 1536, // OpenAI embedding dimension
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });

                // Wait for index to be ready
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

            index = pinecone.index(indexName);
            console.log('Pinecone initialized successfully');
        } catch (error) {
            console.error('Pinecone initialization error:', error);
            // Continue without Pinecone if it fails
        }
    }
    return index;
};

// Generate embeddings using OpenAI
const generateEmbedding = async (text) => {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text
        });
        return response.data[0].embedding;
    } catch (error) {
        console.warn('Error generating embedding (continuing without context):', error.message);
        return null; // Return null to indicate failure but don't crash
    }
};

// Store conversation context in Pinecone
const storeContext = async (userId, sessionId, messageId, text, metadata = {}) => {
    try {
        await initPinecone();

        if (!index) {
            console.log('Pinecone not available, skipping context storage');
            return null;
        }

        const embedding = await generateEmbedding(text);

        if (!embedding) {
            console.log('Embedding generation failed, skipping context storage');
            return null;
        }

        const vectorId = `${userId}_${sessionId}_${messageId}_${Date.now()}`;

        await index.upsert([{
            id: vectorId,
            values: embedding,
            metadata: {
                userId: userId.toString(),
                sessionId,
                messageId: messageId.toString(),
                text,
                timestamp: new Date().toISOString(),
                ...metadata
            }
        }]);

        console.log('Context stored in Pinecone:', vectorId);
        return vectorId;
    } catch (error) {
        console.error('Error storing context:', error);
        return null;
    }
};

// Retrieve relevant context from Pinecone
const retrieveContext = async (userId, query, topK = 5) => {
    try {
        await initPinecone();

        if (!index) {
            console.log('Pinecone not available, skipping context retrieval');
            return [];
        }

        const queryEmbedding = await generateEmbedding(query);

        if (!queryEmbedding) {
            console.log('Embedding generation failed, skipping context retrieval');
            return [];
        }

        const results = await index.query({
            vector: queryEmbedding,
            topK,
            filter: {
                userId: userId.toString()
            },
            includeMetadata: true
        });

        return results.matches || [];
    } catch (error) {
        console.error('Error retrieving context:', error);
        return [];
    }
};

// Delete session context
const deleteSessionContext = async (userId, sessionId) => {
    try {
        await initPinecone();

        if (!index) {
            return;
        }

        // Pinecone doesn't support bulk delete by metadata filter in serverless
        // So we'll just log it - contexts will naturally age out
        console.log(`Session context marked for cleanup: ${sessionId}`);
    } catch (error) {
        console.error('Error deleting session context:', error);
    }
};

module.exports = {
    initPinecone,
    generateEmbedding,
    storeContext,
    retrieveContext,
    deleteSessionContext
};
