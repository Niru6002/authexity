const axios = require('axios');
const FormData = require('form-data');

const API_USER = process.env.NEXT_PUBLIC_API_USER;
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET;

const moderateText = async (text, lang = 'en') => {
    try {
        const data = new FormData();
        data.append('text', text);
        data.append('lang', lang);
        data.append('models', 'general,self-harm');
        data.append('mode', 'ml');
        data.append('api_user', API_USER);
        data.append('api_secret', API_SECRET);

        const response = await axios.post(
            'https://api.sightengine.com/1.0/text/check.json',
            data,
            {
                headers: {
                    ...data.getHeaders(), // Fix: Ensure headers are properly set
                },
            }
        );

        return formatModerationResponse(response.data, text);
    } catch (error) {
        console.error("Error analyzing text moderation:", error);
        return {
            moderationScore: 0,
            flaggedWords: [],
            sanitizedText: text,
            warnings: ["Failed to analyze: " + (error.response?.data || error.message)],
        };
    }
};

const formatModerationResponse = (data, text) => {
    if (data.status !== 'success') {
        return {
            moderationScore: 0,
            flaggedWords: [],
            sanitizedText: text,
            warnings: ["API returned an unsuccessful status"],
        };
    }

    const categories = Object.keys(data.moderation_classes || {}).filter(key => key !== 'available');
    let flaggedWords = [];
    let moderationScore = 0;

    categories.forEach(category => {
        if (data.moderation_classes[category] > 0.05) { // Threshold for significance
            flaggedWords.push(category);
            moderationScore += data.moderation_classes[category] * 100;
        }
    });

    const sanitizedText = flaggedWords.length > 0
        ? text.replace(new RegExp(flaggedWords.join('|'), 'gi'), '****')
        : text;

    return {
        moderationScore: Math.min(moderationScore, 100),
        flaggedWords,
        sanitizedText,
        warnings: flaggedWords.length > 0 ? ["Text contains inappropriate content"] : []
    };
};

module.exports = { moderateText };
