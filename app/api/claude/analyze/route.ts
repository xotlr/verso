import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { screenplay, analysisType } = await request.json();

    if (!screenplay) {
      return NextResponse.json(
        { error: 'Screenplay content is required' },
        { status: 400 }
      );
    }

    // Only use server-side API key for security
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI analysis is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Prepare the prompt based on analysis type
    let prompt = '';
    switch (analysisType) {
      case 'score':
        prompt = `Please analyze this screenplay and provide a detailed scoring across multiple dimensions. Rate each aspect from 1-10 and provide specific feedback:

1. Structure & Pacing (1-10):
   - Three-act structure clarity
   - Scene progression
   - Pacing and rhythm
   
2. Character Development (1-10):
   - Character arcs
   - Distinct voices
   - Motivation clarity
   
3. Dialogue Quality (1-10):
   - Natural flow
   - Subtext usage
   - Character-specific voice
   
4. Visual Storytelling (1-10):
   - Action line clarity
   - Show vs tell balance
   - Cinematic potential
   
5. Theme & Meaning (1-10):
   - Thematic coherence
   - Emotional impact
   - Universal appeal

Provide an overall score (1-10) and a brief summary of strengths and areas for improvement.

Screenplay:
${screenplay}`;
        break;

      case 'suggestions':
        prompt = `Please analyze this screenplay and provide specific, actionable suggestions for improvement. Focus on:

1. Structural improvements
2. Character development opportunities
3. Dialogue enhancements
4. Pacing adjustments
5. Scene-specific feedback

For each suggestion, provide:
- The specific issue
- Why it matters
- How to fix it
- An example if applicable

Screenplay:
${screenplay}`;
        break;

      case 'analysis':
      default:
        prompt = `Please provide a comprehensive analysis of this screenplay covering:

1. **Genre & Tone**: Identify the genre and analyze tonal consistency
2. **Structure**: Evaluate the three-act structure, turning points, and story progression
3. **Characters**: Analyze main characters, their arcs, and relationships
4. **Themes**: Identify central themes and how they're explored
5. **Strengths**: What works well in this screenplay
6. **Areas for Improvement**: What could be enhanced
7. **Market Potential**: Commercial viability and target audience

Screenplay:
${screenplay}`;
        break;
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze screenplay' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysis = data.content[0].text;

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing screenplay:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}