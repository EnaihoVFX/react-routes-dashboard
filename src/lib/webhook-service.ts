// Webhook service for sending WhatsApp updates

interface InvoiceItem {
  id?: number;
  name: string;
  price: number;
  type: 'part' | 'labor' | 'service';
  description?: string;
  laborDescription?: string;
  quantity?: number;
  hours?: number;
  category?: string;
}

interface WebhookPayload {
  message: string;
  item?: InvoiceItem;
  action: 'item_added' | 'item_updated' | 'item_removed' | 'item_made_free' | 'labor_updated';
  timestamp: string;
  jobInfo?: {
    jobNumber?: string;
    customer?: string;
    vehicle?: string;
  };
}

// Generate detailed explanation using Gemini (faster for customer responses)
const generateItemExplanation = async (
  item: InvoiceItem,
  transcript?: string
): Promise<string> => {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!geminiKey || !item) {
    return item.description || item.laborDescription || '';
  }

  try {
    const prompt = `You are a helpful automotive service assistant. Generate a clear, customer-friendly explanation of what the technician is doing with this invoice item.

Item: ${item.name}
Type: ${item.type}
${item.category ? `Category: ${item.category}\n` : ''}${item.description ? `Description: ${item.description}\n` : ''}${item.laborDescription ? `Work: ${item.laborDescription}\n` : ''}${transcript ? `Context from transcript: "${transcript.substring(0, 200)}"\n` : ''}

Generate a brief (1-2 sentences) explanation of what work is being performed or what part is being installed. Make it clear and easy to understand for the customer.

Example: "The technician is replacing the engine mount, which helps reduce engine vibration and improves vehicle stability."

Return only the explanation text, no additional formatting.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 150,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (explanation) {
        return explanation;
      }
    }
  } catch (error) {
    console.warn('Error generating explanation with Gemini:', error);
  }

  // Fallback to existing description
  return item.laborDescription || item.description || '';
};

// Send update to webhook
export const sendWebhookUpdate = async (
  action: WebhookPayload['action'],
  item: InvoiceItem | null,
  jobInfo?: WebhookPayload['jobInfo'],
  transcript?: string
): Promise<void> => {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Webhook URL not configured. Set VITE_WEBHOOK_URL in environment variables.');
    return;
  }

  try {
    let message = '';
    let explanation = '';
    
    // Generate explanation for new items using Gemini (faster than OpenAI)
    if (item && (action === 'item_added' || action === 'labor_updated')) {
      // Try to get Gemini explanation quickly, but don't block too long
      try {
        explanation = await Promise.race([
          generateItemExplanation(item, transcript),
          new Promise<string>((resolve) => setTimeout(() => resolve(''), 2000)) // 2s timeout
        ]);
      } catch (err) {
        console.warn('Explanation generation timeout/error:', err);
      }
      
      // Fallback to existing description if Gemini didn't provide one
      if (!explanation || explanation === '') {
        explanation = item.laborDescription || item.description || '';
      }
    }
    
    switch (action) {
      case 'item_added':
        if (item) {
          if (item.type === 'labor') {
            message = `🔧 *New Labor Added*\n\n` +
              `*Work:* ${item.name}\n` +
              `*Hours:* ${item.hours || 1}\n` +
              `*Price:* $${item.price.toFixed(2)}\n` +
              (item.laborDescription ? `*Description:* ${item.laborDescription}\n` : '') +
              (explanation ? `\n*What's happening:* ${explanation}\n` : '');
          } else {
            message = `🔧 *New Item Added*\n\n` +
              `*Item:* ${item.name}\n` +
              `*Type:* ${item.type}\n` +
              `*Price:* $${item.price.toFixed(2)}\n` +
              (item.description ? `*Description:* ${item.description}\n` : '') +
              (item.category ? `*Category:* ${item.category}\n` : '') +
              (item.quantity && item.quantity > 1 ? `*Quantity:* ${item.quantity}\n` : '') +
              (explanation ? `\n*What's happening:* ${explanation}\n` : '');
          }
        }
        break;
        
      case 'item_updated':
        if (item) {
          message = `✏️ *Item Updated*\n\n` +
            `*Item:* ${item.name}\n` +
            `*Price:* $${item.price.toFixed(2)}\n` +
            (item.description ? `*Description:* ${item.description}\n` : '');
        }
        break;
        
      case 'labor_updated':
        if (item) {
          message = `✏️ *Labor Entry Updated*\n\n` +
            `*Work:* ${item.name}\n` +
            (item.laborDescription ? `*Updated Description:* ${item.laborDescription}\n` : '') +
            (item.description ? `*Details:* ${item.description}\n` : '') +
            `*Total:* $${item.price.toFixed(2)}\n`;
        }
        break;
        
      case 'item_made_free':
        if (item) {
          message = `🎁 *Item Made Free*\n\n` +
            `*Item:* ${item.name}\n` +
            `*Type:* ${item.type}\n` +
            `*Status:* FREE (No charge)\n`;
        }
        break;
        
      case 'item_removed':
        if (item) {
          message = `🗑️ *Item Removed*\n\n` +
            `*Item:* ${item.name}\n` +
            `*Type:* ${item.type}\n`;
        }
        break;
    }

    if (jobInfo) {
      message += `\n*Job Info:*\n`;
      if (jobInfo.jobNumber) message += `Job #${jobInfo.jobNumber}\n`;
      if (jobInfo.customer) message += `Customer: ${jobInfo.customer}\n`;
      if (jobInfo.vehicle) message += `Vehicle: ${jobInfo.vehicle}\n`;
    }

    message += `\n*Time:* ${new Date().toLocaleString()}`;

    const payload: WebhookPayload = {
      message,
      item: item || undefined,
      action,
      timestamp: new Date().toISOString(),
      jobInfo,
    };

    console.log('📤 Sending webhook update:', payload);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook error:', response.status, errorText);
      throw new Error(`Webhook failed: ${response.status} ${errorText}`);
    }

    console.log('✅ Webhook update sent successfully');
  } catch (error) {
    console.error('❌ Error sending webhook update:', error);
    // Don't throw - webhook failures shouldn't break the app
  }
};

// Send summary update when job is completed
export const sendJobSummary = async (
  items: InvoiceItem[],
  total: number,
  jobInfo?: WebhookPayload['jobInfo']
): Promise<void> => {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return;
  }

  try {
    let message = `✅ *Job Completed - Invoice Summary*\n\n`;
    
    if (jobInfo) {
      message += `*Job Info:*\n`;
      if (jobInfo.jobNumber) message += `Job #${jobInfo.jobNumber}\n`;
      if (jobInfo.customer) message += `Customer: ${jobInfo.customer}\n`;
      if (jobInfo.vehicle) message += `Vehicle: ${jobInfo.vehicle}\n\n`;
    }

    message += `*Items:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name}`;
      if (item.laborDescription) {
        message += `\n   Work: ${item.laborDescription}`;
      } else if (item.description) {
        message += `\n   ${item.description}`;
      }
      message += `\n   $${item.price === 0 ? 'FREE' : item.price.toFixed(2)}\n\n`;
    });

    message += `*Total: $${total.toFixed(2)}*\n\n`;
    message += `*Time:* ${new Date().toLocaleString()}`;

    const payload = {
      message,
      items,
      total,
      timestamp: new Date().toISOString(),
      jobInfo,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    console.log('✅ Job summary sent to webhook');
  } catch (error) {
    console.error('❌ Error sending job summary:', error);
  }
};

