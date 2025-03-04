const Parser = require('rss-parser');
const { pipeline } = require('@xenova/transformers');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nlp = require('compromise');
const parser = new Parser();
const { config } = require("dotenv");

config();
const api_key = process.env.google_api_key;

async function fetchGoogleNews(query = "technology", maxItems = 5) {
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    try {
        const feed = await parser.parseURL(url);
        return feed.items.slice(0, maxItems);
    } catch (error) {
        console.error("Error fetching news:", error);
        return [];
    }
}

async function analyzeText(items) {
    const overallSentiment = [];
    const overallTokens = [];
    const sentiment = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    console.log("Analyzing.........")

    for (const item of items) {
        const text = item.title || item.contentSnippet || "No text available";
        const doc = nlp(text);
        const nouns = doc.nouns().out('array');
        overallTokens.push(nouns);
        const sentimentResult = await sentiment(text);
        overallSentiment.push(sentimentResult[0]);
    }
    return { overallSentiment, overallTokens };
}

const genAI = new GoogleGenerativeAI(api_key);

async function report(sentiments, tokens) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const systemPrompt = `You are a specialized sentiment analysis and news emotion evaluation assistant...`;
        const msg = `Tokenized words: ${JSON.stringify(tokens)}\nSentiment scores: ${JSON.stringify(sentiments)}`;
        
        const result = await model.generateContent({
            contents: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "user", parts: [{ text: msg }] }
            ],
            generationConfig: { maxOutputTokens: 2048 },
        });
        
        return result.response.text();
    } catch (err) {
        console.error("Error in report generation:", err);
        return null;
    }
}

function displayResultsInTable(feed, sentiments, report) {
    console.log("\n=============== NEWS SENTIMENT ANALYSIS ===============\n");
    console.log("ANALYZED ARTICLES:");
    console.log("--------------------------------------------------------------");
    console.log("| #  | HEADLINE                                | SENTIMENT  | SCORE |");
    console.log("--------------------------------------------------------------");
    feed.forEach((item, index) => {
        const headline = item.title.length > 35 ? item.title.substring(0, 32) + "..." : item.title.padEnd(35);
        const sentimentLabel = sentiments[index].label.padEnd(10);
        const sentimentScore = sentiments[index].score.toFixed(2).padEnd(6);
        console.log(`| ${(index+1).toString().padEnd(2)} | ${headline} | ${sentimentLabel} | ${sentimentScore} |`);
    });
    console.log("--------------------------------------------------------------");
    console.log("\nSENTIMENT ANALYSIS REPORT:");
    console.log("--------------------------------------------------------------");
    report.split('\n').forEach(line => {
        console.log(`| ${line.padEnd(60)} |`);
    });
    console.log("--------------------------------------------------------------");
}

(async () => {
    try {
        const feed = await fetchGoogleNews("recent climate change", 15);
        const { overallSentiment, overallTokens } = await analyzeText(feed);
        const genReport = await report(overallSentiment, overallTokens);
        displayResultsInTable(feed, overallSentiment, genReport);
    } catch (error) {
        console.error("Error in main execution:", error);
    }
})();
