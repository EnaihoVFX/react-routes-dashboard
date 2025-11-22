// OpenAI Agent for extracting invoice items from transcript
interface InvoiceItem {
  id?: number;
  name: string;
  price: number;
  type: 'part' | 'labor' | 'service';
  description?: string;
  laborDescription?: string; // Specific description for labor entries
  quantity?: number;
  hours?: number; // For labor entries
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
  apiKey?: string,
  fullTranscript?: Array<{ text: string; timestamp: string }>
): Promise<InvoiceItem[]> => {
  const openaiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.warn('OpenAI API key not found, falling back to basic parsing');
    return [];
  }

  // Build full context from transcript history if available
  let fullContext = transcript;
  if (fullTranscript && fullTranscript.length > 0) {
    // Include last 10 transcript entries for better context
    const recentEntries = fullTranscript.slice(-10);
    fullContext = recentEntries.map(t => t.text).join(' ');
  }

  try {
    // Use full context for better understanding (last 1500 chars for context)
    const contextToUse = fullContext.length > 1500 ? fullContext.substring(fullContext.length - 1500) : fullContext;
    
    const prompt = `You are an expert automotive service invoice assistant. Analyze the technician's spoken transcript and extract ALL parts, labor, and services with SPECIFIC names and details.

CRITICAL: You MUST extract the ACTUAL part names mentioned. Do NOT use generic names like "Part", "Component", or "Item". If a part is mentioned, use its specific name (e.g., "Engine Mount", "Brake Pad", "Oil Filter", "Spark Plug", "Alternator", etc.).

Transcript: "${contextToUse}"

Extraction Rules:
1. NAME: Use the EXACT part name mentioned (e.g., "Engine Mount", "Brake Rotor", "Timing Belt"). If only a category is mentioned, infer a reasonable specific name (e.g., if "mount" is mentioned → "Engine Mount" or "Transmission Mount" based on context). For labor, use format "Labor (X Hour(s))".
2. PRICE: Extract the exact price if mentioned in the transcript. If no price is mentioned, estimate based on realistic automotive retail prices:
   - Common parts: $25-$150 (filters, belts, sensors, small components)
   - Medium parts: $150-$350 (alternators, starters, radiators, suspension components)
   - Large parts: $350-$800 (transmissions, engines, major body parts)
   - Labor: $85-$120/hour (standard automotive labor rate)
   Use realistic market prices, not inflated estimates.
3. TYPE: "part" for physical parts, "labor" for work time, "service" for services like diagnostics, oil changes, etc.
4. DESCRIPTION: Include what was done (e.g., "Replaced front engine mount", "Installed new brake pads", "Performed oil change")
5. LABOR_DESCRIPTION: For labor entries, extract a detailed description of the work performed (e.g., "Replaced engine mount and installed new brake pads", "Diagnosed electrical issue and replaced alternator")
6. HOURS: For labor entries, extract the number of hours (e.g., "2 hours" → 2, "1.5 hours" → 1.5)
7. QUANTITY: Extract if mentioned (e.g., "2 brake pads", "4 spark plugs"), default to 1
8. PART NUMBER: Extract if mentioned
9. BRAND: Extract brand name if mentioned (e.g., "AC Delco", "Bosch", "Motorcraft")
10. CATEGORY: Specific category like "engine", "brake", "electrical", "suspension", "transmission", "cooling", "fuel", "exhaust", "ignition", etc.

Common automotive parts to recognize:
- Engine: mounts, gaskets, belts (timing, serpentine), filters (oil, air, fuel), spark plugs, alternator, starter, water pump, radiator, thermostat
- Brake: pads, rotors, calipers, brake fluid, brake lines
- Suspension: struts, shocks, control arms, ball joints, tie rods, sway bar links
- Transmission: fluid, filter, gaskets
- Electrical: battery, alternator, starter, fuses, wiring
- Cooling: radiator, water pump, thermostat, coolant, hoses
- Fuel: fuel pump, fuel filter, injectors
- Exhaust: muffler, catalytic converter, oxygen sensors
- Ignition: spark plugs, ignition coils, distributor

Return a JSON object with an "items" array. Example:
{
  "items": [
    {
      "name": "Engine Mount",
      "price": 45.00,
      "type": "part",
      "description": "Replaced front engine mount",
      "quantity": 1,
      "partNumber": null,
      "brand": null,
      "category": "engine"
    },
    {
      "name": "Brake Pads (Front)",
      "price": 35.00,
      "type": "part",
      "description": "Installed new front brake pads",
      "quantity": 1,
      "partNumber": null,
      "brand": null,
      "category": "brake"
    },
    {
      "name": "Labor (2 Hours)",
      "price": 170.00,
      "type": "labor",
      "description": "2 hours of labor",
      "laborDescription": "Replaced engine mount and installed new front brake pads",
      "hours": 2,
      "quantity": 2,
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
    
    // Add IDs, validate/update prices, and fetch images for parts
    const itemsWithIds = await Promise.all(
      items.map(async (item: InvoiceItem, index: number) => {
        const itemWithId = {
          ...item,
          id: Date.now() + index,
        };

        // Validate and update price if missing or unrealistic
        if (item.type === 'part' && (!item.price || item.price <= 0 || item.price > 5000)) {
          try {
            const estimatedPrice = await getPartPrice(item.name, item.category);
            if (estimatedPrice && estimatedPrice > 0) {
              itemWithId.price = estimatedPrice;
              console.log(`💰 Updated price for ${item.name}: $${estimatedPrice}`);
            }
          } catch (error) {
            console.warn(`Failed to estimate price for ${item.name}:`, error);
          }
        }

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

// Fetch image for a part using multiple sources for better results
const fetchPartImage = async (partName: string, category?: string): Promise<string | undefined> => {
  try {
    // Try multiple image sources in order of preference
    
    // 1. Try Unsplash with specific automotive part search
    // Note: Use your Unsplash Access Key (Client ID), NOT the Secret Key
    // Get it from: https://unsplash.com/developers
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        // More specific search terms for better results
        const searchTerms = [
          `${partName} automotive part isolated`,
          `${partName} car part replacement`,
          `${category ? `${category} ` : ''}${partName} auto part`,
          `${partName} vehicle component`
        ];
        
        for (const searchQuery of searchTerms) {
          const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=square`,
            {
              headers: {
                'Authorization': `Client-ID ${unsplashKey}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const imageUrl = data.results?.[0]?.urls?.regular || data.results?.[0]?.urls?.small || data.results?.[0]?.urls?.thumb;
            if (imageUrl) {
              console.log(`✅ Found image for ${partName} from Unsplash`);
              return imageUrl;
            }
          }
        }
      } catch (error) {
        console.warn('Unsplash image fetch failed:', error);
      }
    }
    
    // 2. Try Pexels API (free, no key required for some endpoints, but better with key)
    try {
      const pexelsKey = import.meta.env.VITE_PEXELS_API_KEY;
      if (pexelsKey) {
        const pexelsQuery = `${partName} automotive part`;
        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(pexelsQuery)}&per_page=1&orientation=square`,
          {
            headers: {
              'Authorization': pexelsKey,
            },
          }
        );
        
        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          const pexelsImage = pexelsData.photos?.[0]?.src?.medium || pexelsData.photos?.[0]?.src?.small;
          if (pexelsImage) {
            console.log(`✅ Found image for ${partName} from Pexels`);
            return pexelsImage;
          }
        }
      }
    } catch (error) {
      console.warn('Pexels image fetch failed:', error);
    }
    
    // 3. Use a more specific placeholder that looks like a part
    // Using a service that generates better automotive part placeholders
    return `https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&h=200&fit=crop&auto=format&q=80&text=${encodeURIComponent(partName)}`;
  } catch (error) {
    console.warn('Error fetching image:', error);
    // Return a generic automotive placeholder
    return `https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&h=200&fit=crop&auto=format&q=80&text=${encodeURIComponent(partName)}`;
  }
};

// Get estimated price for a part (using a simple pricing database or AI estimation)
export const getPartPrice = async (
  partName: string,
  category?: string,
  apiKey?: string
): Promise<number | null> => {
  // Comprehensive pricing database for common automotive parts (realistic retail prices)
  const pricingDatabase: Record<string, number> = {
    // Engine Components
    'engine mount': 45,
    'motor mount': 45,
    'transmission mount': 55,
    'engine gasket': 25,
    'head gasket': 85,
    'valve cover gasket': 35,
    'oil pan gasket': 40,
    'water pump': 120,
    'thermostat': 25,
    'radiator': 200,
    'radiator hose': 35,
    'heater hose': 25,
    'coolant': 18,
    'antifreeze': 18,
    
    // Ignition System
    'spark plug': 5,
    'ignition coil': 65,
    'distributor cap': 45,
    'spark plug wire': 25,
    
    // Electrical
    'alternator': 180,
    'starter': 200,
    'battery': 140,
    'starter solenoid': 45,
    'voltage regulator': 55,
    
    // Brake System
    'brake pad': 45,
    'brake rotor': 75,
    'brake disc': 75,
    'brake caliper': 120,
    'brake line': 35,
    'brake fluid': 12,
    'brake master cylinder': 95,
    'brake booster': 180,
    
    // Suspension
    'shock absorber': 85,
    'strut': 120,
    'control arm': 95,
    'ball joint': 45,
    'tie rod': 55,
    'sway bar link': 35,
    'sway bar': 120,
    'bushing': 25,
    
    // Exhaust
    'muffler': 150,
    'catalytic converter': 450,
    'exhaust pipe': 85,
    'oxygen sensor': 65,
    'o2 sensor': 65,
    
    // Fuel System
    'fuel pump': 180,
    'fuel filter': 25,
    'fuel injector': 85,
    'fuel pressure regulator': 55,
    'gas cap': 15,
    
    // Transmission
    'transmission fluid': 18,
    'transmission filter': 35,
    'transmission mount': 55,
    'clutch': 250,
    'clutch disc': 180,
    'pressure plate': 120,
    
    // Filters
    'oil filter': 8,
    'air filter': 18,
    'cabin air filter': 25,
    'fuel filter': 25,
    
    // Belts & Hoses
    'timing belt': 55,
    'serpentine belt': 35,
    'drive belt': 35,
    'v-belt': 25,
    'radiator hose': 35,
    'heater hose': 25,
    
    // Tires & Wheels
    'tire': 95,
    'wheel': 120,
    'wheel bearing': 65,
    'hub bearing': 65,
    'tire pressure sensor': 45,
    
    // Steering
    'power steering pump': 180,
    'power steering fluid': 12,
    'steering rack': 350,
    'steering column': 250,
    'steering wheel': 150,
    
    // Lights
    'headlight': 120,
    'taillight': 85,
    'turn signal': 35,
    'fog light': 65,
    'bulb': 8,
    
    // Body Parts
    'bumper': 250,
    'fender': 180,
    'hood': 350,
    'door': 450,
    'mirror': 85,
    'windshield': 300,
    'windshield wiper': 25,
    'wiper blade': 18,
    
    // Fluids
    'motor oil': 25,
    'transmission fluid': 18,
    'brake fluid': 12,
    'power steering fluid': 12,
    'coolant': 18,
    'antifreeze': 18,
    
    // Sensors
    'mass air flow sensor': 95,
    'map sensor': 65,
    'throttle position sensor': 55,
    'crankshaft position sensor': 75,
    'camshaft position sensor': 65,
    'knock sensor': 45,
    'coolant temperature sensor': 35,
    'oxygen sensor': 65,
    'o2 sensor': 65,
    
    // Other Common Parts
    'pcv valve': 15,
    'egr valve': 85,
    'idle air control valve': 75,
    'throttle body': 180,
    'intake manifold': 250,
    'exhaust manifold': 200,
    'turbocharger': 850,
    'supercharger': 1200,
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

