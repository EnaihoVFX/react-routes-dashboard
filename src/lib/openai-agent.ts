// OpenAI Agent for extracting invoice items from transcript
interface InvoiceItem {
  id?: number;
  name: string;
  price: number;
  type: 'part' | 'labor' | 'service';
  description?: string;
  quantity?: number;
  unit?: string;
  imageUrl?: string;
  partNumber?: string;
  brand?: string;
  category?: string;
}

interface OpenAIResponse {
  items: InvoiceItem[];
}

// Extract invoice items using OpenAI
export const extractInvoiceItemsWithAI = async (
  transcript: string,
  apiKey?: string
): Promise<InvoiceItem[]> => {
  const openaiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.warn('OpenAI API key not found, falling back to basic parsing');
    return [];
  }

  try {
    const prompt = `You are an AI assistant that extracts invoice items from a technician's spoken transcript. 
Analyze the following transcript and extract all parts, labor, and services mentioned with their prices.

Transcript: "${transcript}"

Extract items with the following structure:
- name: Clear, descriptive name of the item
- price: Numeric price (if mentioned, otherwise estimate based on typical automotive part/service prices)
- type: "part", "labor", or "service"
- description: Brief description of what was done or the part
- quantity: Number of units (default to 1 if not specified)
- partNumber: Part number if mentioned
- brand: Brand name if mentioned
- category: Category like "engine", "brake", "electrical", etc.

Return a JSON object with an "items" array in this format:
{
  "items": [
    {
      "name": "Engine Mount",
      "price": 45.00,
      "type": "part",
      "description": "Replaced engine mount",
      "quantity": 1,
      "partNumber": null,
      "brand": null,
      "category": "engine"
    },
    {
      "name": "Labor (1 Hour)",
      "price": 85.00,
      "type": "labor",
      "description": "1 hour of labor for installation",
      "quantity": 1,
      "category": "labor"
    }
  ]
}

If no items are found, return {"items": []}.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts structured invoice data from transcripts. Return a JSON object with an "items" array containing the extracted invoice items.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON array from text if it's wrapped
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from OpenAI');
      }
    }
    
    // Handle both {items: [...]} and [...] formats
    let items: InvoiceItem[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      items = parsed.items;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      items = parsed.data;
    }
    
    // Add IDs and fetch images for parts
    const itemsWithIds = await Promise.all(
      items.map(async (item: InvoiceItem, index: number) => {
        const itemWithId = {
          ...item,
          id: Date.now() + index,
        };

        // Fetch image for parts
        if (item.type === 'part' && item.name) {
          try {
            itemWithId.imageUrl = await fetchPartImage(item.name, item.category);
          } catch (error) {
            console.warn(`Failed to fetch image for ${item.name}:`, error);
          }
        }

        return itemWithId;
      })
    );

    return itemsWithIds;
  } catch (error) {
    console.error('Error extracting items with AI:', error);
    throw error;
  }
};

// Fetch image for a part using Unsplash API
const fetchPartImage = async (partName: string, category?: string): Promise<string | undefined> => {
  try {
    const searchQuery = category 
      ? `${category} ${partName} automotive part`
      : `${partName} automotive part car`;
    
    // Using Unsplash API (free tier allows 50 requests/hour)
    // You can get a free API key from https://unsplash.com/developers
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    
    if (!unsplashKey) {
      // Fallback to a placeholder service or return undefined
      return `https://via.placeholder.com/200x200?text=${encodeURIComponent(partName)}`;
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=square`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Unsplash API error');
    }

    const data = await response.json();
    const imageUrl = data.results?.[0]?.urls?.small || data.results?.[0]?.urls?.thumb;
    
    return imageUrl || `https://via.placeholder.com/200x200?text=${encodeURIComponent(partName)}`;
  } catch (error) {
    console.warn('Error fetching image:', error);
    // Return placeholder if image fetch fails
    return `https://via.placeholder.com/200x200?text=${encodeURIComponent(partName)}`;
  }
};

// Get estimated price for a part (using a simple pricing database or AI estimation)
export const getPartPrice = async (
  partName: string,
  category?: string,
  apiKey?: string
): Promise<number | null> => {
  // Simple pricing database for common parts
  const pricingDatabase: Record<string, number> = {
    'engine mount': 45,
    'brake pad': 35,
    'brake rotor': 60,
    'oil filter': 8,
    'air filter': 15,
    'battery': 120,
    'tire': 80,
    'spark plug': 5,
    'alternator': 150,
    'starter': 180,
    'radiator': 200,
    'water pump': 120,
    'timing belt': 50,
    'serpentine belt': 25,
    'fuel filter': 20,
    'transmission fluid': 15,
    'brake fluid': 12,
    'power steering fluid': 10,
  };

  const normalizedName = partName.toLowerCase();
  
  // Check database first
  for (const [key, price] of Object.entries(pricingDatabase)) {
    if (normalizedName.includes(key)) {
      return price;
    }
  }

  // If not found, use OpenAI to estimate price
  const openaiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a pricing assistant. Return only a numeric price estimate in USD for automotive parts.'
            },
            {
              role: 'user',
              content: `What is the typical retail price for a ${partName}${category ? ` (${category})` : ''} for a car? Return only the numeric price, no currency symbols or text.`
            }
          ],
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const priceText = data.choices[0]?.message?.content?.trim();
        const price = parseFloat(priceText?.replace(/[^0-9.]/g, ''));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    } catch (error) {
      console.warn('Error estimating price with AI:', error);
    }
  }

  return null;
};

