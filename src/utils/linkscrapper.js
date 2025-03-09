import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Extracts URLs from a given text.
 * @param {string} text - The input text containing URLs.
 * @returns {Array} - Extracted URLs.
 */
export const extractLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

/**
 * Fetches and scrapes text content from a given URL.
 * @param {string} url - The URL to scrape content from.
 * @returns {Promise<string>} - Extracted website content.
 */
export const scrapeWebsiteContent = async (url) => {
  try {
    const { data } = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(data);
    
    // Extract readable text from body (limit size to avoid overload)
    return $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return "Unable to fetch website content.";
  }
};

/**
 * Analyzes links in a message by extracting URLs and fetching their content.
 * @param {string} message - The input message containing URLs.
 * @returns {Promise<Object>} - Analysis results.
 */
export const analyzeLinkContent = async (message) => {
  const urls = extractLinks(message);
  
  if (urls.length === 0) {
    return {
      foundLinks: false,
      message: "No links found in the message",
    };
  }

  const processedLinks = await Promise.all(
    urls.map(async (url) => {
      const content = await scrapeWebsiteContent(url);
      return {
        url,
        content: content || "No readable content extracted.",
      };
    })
  );

  return {
    foundLinks: true,
    processedLinks,
    allLinks: urls,
  };
};
