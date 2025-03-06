import { NextResponse } from 'next/server';
import { load } from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // First, check URL security with VirusTotal
    const securityCheck = await checkUrlSecurity(targetUrl);

    // Fetch the content from the provided URL
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    // Extract metadata using common meta tags
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  $('title').text() || '';
                  
    const description = $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="twitter:description"]').attr('content') || 
                        $('meta[name="description"]').attr('content') || '';
                        
    const image = $('meta[property="og:image"]').attr('content') || 
                  $('meta[name="twitter:image"]').attr('content') || '';
                  
    const siteName = $('meta[property="og:site_name"]').attr('content') || '';
    
    const author = $('meta[name="author"]').attr('content') || 
                   $('meta[property="article:author"]').attr('content') || '';
                   
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                          $('meta[name="published_date"]').attr('content') || '';

    // Get favicon
    const favicon = $('link[rel="icon"]').attr('href') || 
                    $('link[rel="shortcut icon"]').attr('href') || 
                    new URL('/favicon.ico', targetUrl).href;

    // Extract the main content (simplistic approach)
    let mainContent = '';
    
    // Try to find content in common article containers
    const contentSelectors = [
      'article', 
      '.article', 
      '.post-content', 
      '.entry-content', 
      'main', 
      '#content',
      '.content'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        // Remove scripts, styles, and comments
        element.find('script, style, noscript, iframe').remove();
        mainContent = element.html();
        break;
      }
    }

    // If no content was found with the selectors, take the body content as fallback
    if (!mainContent) {
      const body = $('body');
      body.find('script, style, noscript, iframe, nav, footer, header, aside').remove();
      mainContent = body.html();
    }

    // Clean up the content (basic sanitization)
    mainContent = mainContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    const result = {
      title,
      description,
      image,
      siteName,
      author,
      publishedDate,
      favicon: favicon ? new URL(favicon, targetUrl).href : null,
      content: mainContent,
      url: targetUrl,
      securityCheck // Include the security check results
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error scraping URL:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to check URL security using VirusTotal
async function checkUrlSecurity(url) {
  try {
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'x-apikey': '366ca455547c1c0a7bb75d355face3757f4b2ca1ffafbf5d7c71b3ae4917a946',
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({url: url})
    };

    const response = await fetch('https://www.virustotal.com/api/v3/urls', options);
    
    if (!response.ok) {
      throw new Error(`VirusTotal API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    let securityStatus = {
      isChecked: true,
      isMalicious: false,
      status: 'unknown',
      stats: null,
      details: null
    };

    // If we have analysis data directly
    if (data.data && data.data.attributes && data.data.attributes.stats) {
      securityStatus.stats = data.data.attributes.stats;
      securityStatus.details = data.data.attributes.results;
      
      // Determine if URL is malicious
      securityStatus.isMalicious = 
        data.data.attributes.stats.malicious > 0 || 
        data.data.attributes.stats.suspicious > 0;
      
      securityStatus.status = securityStatus.isMalicious ? 'malicious' : 'safe';
      return securityStatus;
    }
    
    // If we need to fetch the analysis separately
    if (data.data && data.data.id) {
      // For simplicity in this example, we'll return what we have
      securityStatus.status = 'pending';
      securityStatus.message = 'Security check submitted';
      return securityStatus;
    }

    return securityStatus;
  } catch (error) {
    console.error("Error checking URL security:", error);
    return {
      isChecked: false,
      error: error.message,
      status: 'check_failed'
    };
  }
}
