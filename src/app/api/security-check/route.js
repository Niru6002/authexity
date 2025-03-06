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
    
    // First, we need to extract the analysis ID from the initial response
    if (data.data && data.data.id) {
      // Extract the ID - this is the analysis ID we need for the next request
      const id = data.data.id;
      console.log("Analysis ID:", id);
      
      // Use the correct endpoint for getting analysis results
      const analysisUrl = `https://www.virustotal.com/api/v3/analyses/${id}`;
      
      const analysisOptions = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-apikey': '366ca455547c1c0a7bb75d355face3757f4b2ca1ffafbf5d7c71b3ae4917a946'
        }
      };
      
      const analysisResponse = await fetch(analysisUrl, analysisOptions);
      
      if (!analysisResponse.ok) {
        throw new Error(`Analysis retrieval error: ${analysisResponse.statusText}`);
      }
      
      const analysisData = await analysisResponse.json();
      console.log("Analysis data received");
      return NextResponse.json(analysisData);
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
