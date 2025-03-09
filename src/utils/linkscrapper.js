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
 * Fetches and scrapes rich content from a given URL.
 * @param {string} url - The URL to scrape content from.
 * @returns {Promise<Object>} - Extracted website content including text, images, and metadata.
 */
export const scrapeWebsiteContent = async (url) => {
  try {
    const { data } = await axios.get(url, { timeout: 8000 });
    const $ = cheerio.load(data);
    
    // Extract metadata
    const title = $("title").text().trim() || $("h1").first().text().trim() || "";
    const description = $('meta[name="description"]').attr("content") || 
                        $('meta[property="og:description"]').attr("content") || 
                        "";
    
    // Extract main text content (limited to avoid overload)
    const textContent = $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);
    
    // Extract images (up to 10)
    const images = [];
    $("img").each((i, img) => {
      if (i < 10) {
        const src = $(img).attr("src");
        const alt = $(img).attr("alt") || "";
        
        if (src) {
          // Handle relative URLs
          const imageUrl = src.startsWith("http") ? src : new URL(src, url).href;
          images.push({ url: imageUrl, alt });
        }
      }
    });
    
    // Extract favicon
    const favicon = $('link[rel="icon"]').attr("href") || 
                    $('link[rel="shortcut icon"]').attr("href") || 
                    new URL("/favicon.ico", url).href;
    
    // Extract social media metadata
    const ogImage = $('meta[property="og:image"]').attr("content") || "";
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogType = $('meta[property="og:type"]').attr("content") || "";
    
    // Extract author information
    const author = $('meta[name="author"]').attr("content") || "";
    
    // Extract published date
    const publishedDate = $('meta[property="article:published_time"]').attr("content") || 
                          $('meta[name="date"]').attr("content") || "";
    
    // Extract main links from the page (up to 10)
    const links = [];
    $("a").each((i, link) => {
      if (i < 10) {
        const href = $(link).attr("href");
        const text = $(link).text().trim();
        
        if (href && text && !href.startsWith("#") && !href.startsWith("javascript:")) {
          // Handle relative URLs
          const fullUrl = href.startsWith("http") ? href : new URL(href, url).href;
          links.push({ url: fullUrl, text });
        }
      }
    });

    return {
      url,
      title,
      description,
      textContent,
      images,
      metadata: {
        favicon: favicon.startsWith("http") ? favicon : new URL(favicon, url).href,
        ogImage: ogImage ? (ogImage.startsWith("http") ? ogImage : new URL(ogImage, url).href) : null,
        ogTitle,
        ogType,
        author,
        publishedDate
      },
      links
    };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return {
      url,
      error: `Unable to fetch website content: ${error.message}`,
      title: "",
      description: "",
      textContent: "Unable to fetch website content.",
      images: [],
      metadata: {},
      links: []
    };
  }
};

/**
 * Analyzes links in a message by extracting URLs and fetching their rich content.
 * @param {string} message - The input message containing URLs.
 * @returns {Promise<Object>} - Analysis results with rich content.
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
      return await scrapeWebsiteContent(url);
    })
  );

  return {
    foundLinks: true,
    processedLinks,
    allLinks: urls,
  };
};
