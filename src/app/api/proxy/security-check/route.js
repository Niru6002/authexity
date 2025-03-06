import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    console.log(url)
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
    console.log(data,response)
    
    // Process the analysis data to get the results
    let analysisData = null;
    
    // If we need to get analysis directly
    if (data.data && data.data.id && data.data.type === 'analysis') {
      analysisData = data;
    }
    
    // If we have a URL ID, we can get its latest analysis
    else if (data.data && data.data.id) {
      const id = data.data.id;
      
      // For URL objects, we need to get the latest analysis
      if (data.data.type === 'url') {
        const analysisUrl = `https://www.virustotal.com/api/v3/urls/${id}/analyse`;
        
        const analysisResponse = await fetch(analysisUrl, {
          headers: {
            accept: 'application/json',
            'x-apikey': '366ca455547c1c0a7bb75d355face3757f4b2ca1ffafbf5d7c71b3ae4917a946'
          }
        });
        
        if (!analysisResponse.ok) {
          throw new Error(`Analysis retrieval error: ${analysisResponse.statusText}`);
        }
        
        analysisData = await analysisResponse.json();
      } else {
        // Otherwise, try to get the analysis directly
        const analysisUrl = `https://www.virustotal.com/api/v3/analyses/${id}`;
        
        const analysisResponse = await fetch(analysisUrl, {
          headers: {
            accept: 'application/json',
            'x-apikey': '366ca455547c1c0a7bb75d355face3757f4b2ca1ffafbf5d7c71b3ae4917a946'
          }
        });
        
        if (!analysisResponse.ok) {
          throw new Error(`Analysis retrieval error: ${analysisResponse.statusText}`);
        }
        
        analysisData = await analysisResponse.json();
      }
    }

    // Format the response for the frontend
    if (analysisData && analysisData.data && analysisData.data.attributes) {
      const { stats, status, results } = analysisData.data.attributes;
      
      // Determine if the URL is safe (malicious count is zero)
      const isSafe = stats.malicious === 0;
      
      return NextResponse.json({
        url,
        isSafe,
        status,
        stats,
        analysisId: analysisData.data.id,
        fullResponse: analysisData
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error checking URL security:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
