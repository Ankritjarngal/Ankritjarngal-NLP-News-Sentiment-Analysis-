# News Sentiment Analysis

This project fetches news articles based on a given query and analyzes their sentiment using NLP techniques. It extracts key nouns from the news headlines and evaluates the sentiment of each article using a pre-trained transformer model. Additionally, a generative AI model provides an overall sentiment analysis report.

## Features

- Fetches news articles from Google News RSS feed.
- Extracts key nouns using the `compromise` NLP library.
- Performs sentiment analysis with `Xenova/distilbert-base-uncased-finetuned-sst-2-english`.
- Generates a structured report using Google Gemini AI.
- Displays results in a tabular format.
