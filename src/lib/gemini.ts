import { GoogleGenAI } from "@google/genai";



export const model = "gemini-3-flash-preview";

export interface IndexResponse {
  summary: string;
  keywords: string[];
  suggestedConnections: string[]; // These will be used to look up other note IDs
}

async function callAI(
  messages: {role: string, content: string}[], 
  enableReasoning: boolean = false,
  onProgress?: (progress: number) => void
): Promise<string> {
  const selectedApiKeyId = localStorage.getItem('selected_api_key_id');
  const apiKeys = JSON.parse(localStorage.getItem('openrouter_keys') || '[]');
  const selectedKey = apiKeys.find((k: any) => k.id === selectedApiKeyId);
  
  // Use selected key if available, otherwise fallback to default
  const activeKey = selectedKey ? selectedKey.key : (import.meta.env.VITE_GEMINI_API_KEY || "");
  const activeModel = selectedKey ? selectedKey.model : model;

  if (selectedKey && !activeModel.includes("gemini")) {
    if (selectedKey.embedded) {
        console.log("AI Request (OpenRouter Embeddings):", JSON.stringify({
            model: selectedKey.model,
            input: messages.map(m => m.content).join('\n')
        }, null, 2));

        const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${activeKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin, 
            "X-Title": "Second Brain",
          },
          body: JSON.stringify({
            "model": activeModel,
            "input": messages.map(m => m.content).join('\n'),
            "encoding_format": "float"
          })
        });

        const data = await response.json();
        return JSON.stringify(data.data[0].embedding);
    }

    if (onProgress) onProgress(20);

    if (enableReasoning) {
        const response1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${activeKey}`,
                "HTTP-Referer": window.location.origin, 
                "X-Title": "Second Brain",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: activeModel,
                messages: messages,
                reasoning: { enabled: true }
            })
        });
        if (onProgress) onProgress(50);
        const result1 = await response1.json();
        const message1 = result1.choices[0].message;

        const updatedMessages = [
            ...messages.slice(0, -1),
            { role: 'assistant', content: message1.content, reasoning_details: message1.reasoning_details },
            messages[messages.length - 1]
        ];

        const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${activeKey}`,
                "HTTP-Referer": window.location.origin, 
                "X-Title": "Second Brain",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: activeModel,
                messages: updatedMessages
            })
        });
        if (onProgress) onProgress(80);
        const result2 = await response2.json();
        if (onProgress) onProgress(100);
        return result2.choices[0].message.content;

    } else {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${activeKey}`,
                "HTTP-Referer": window.location.origin, 
                "X-Title": "Second Brain",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: activeModel,
                messages: messages
            })
        });
        if (onProgress) onProgress(60);
        const data = await response.json();
        if (onProgress) onProgress(100);
        
        if (!response.ok) {
            throw new Error(data.error?.message || `API Error: ${response.status}`);
        }
        
        if (!data.choices || !data.choices[0]) {
            throw new Error("Risposta API non valida: mancano i 'choices'.");
        }
        
        return data.choices[0].message.content;
    }
  }
  
  // Gemini Native SDK Fallback (or if gemini is explicitly selected)
  if (onProgress) onProgress(30);
  
  // Re-initialize Gemini with the active key using @google/genai syntax
  const geminiAI = new GoogleGenAI({ apiKey: activeKey });
  
  const contents = messages.map(m => m.content).join('\n\n');
  console.log("AI Request (Gemini):", contents);
  
  const response = await geminiAI.models.generateContent({
    model: activeModel,
    contents: contents,
    config: {
        systemInstruction: "Sei un assistente che analizza solo le informazioni fornite nel contesto. Non aggiungere informazioni esterne e non inventare nulla (allucinazioni). Se la risposta non è presente, ammettilo."
    }
  });
  
  console.log("AI Response (Gemini):", response);
  if (onProgress) onProgress(100);
  
  return response.text || "";
}

export async function indexContent(title: string, content: string, existingKeywords: string[], customPrompt?: string, onProgress?: (p: number) => void): Promise<IndexResponse> {
  const fileUrlMatch = content.match(/\[FILE: .*\]\((.*)\)/);
  const fileUrl = fileUrlMatch ? fileUrlMatch[1] : null;

  const prompt = `
    Analyze the following content for a "Second Brain" system.
    Title: ${title}
    Content: ${content}
    ${fileUrl ? `\nFile reference: ${fileUrl}\n` : ''}
    
    Existing system keywords: ${existingKeywords.join(', ')}
    
    ${customPrompt ? `\nInstructions for correction/re-analysis: ${customPrompt}\n` : ''}
    
    Tasks:
    1. Fornisci un riassunto conciso (max 3 frasi) in ITALIANO. Assicurati di includere entità chiave come nomi di stati, organizzazioni, persone e date se presenti nel testo.
    2. Estrai 5-8 parole chiave (keywords) rilevanti che catturino l'essenza del contenuto e le entità geografiche/politiche citate.
       - IMPORTANTE: Se una categoria simile o sinonimo esiste già in "Existing system keywords", USA ESATTAMENTE quella parola invece di crearne una nuova.
       - IMPORTANTE: DEVI restituire ALMENO 3 parole chiave in ogni caso.
       - Mantieni i tag in minuscolo.
    3. Identifica 3 potenziali connessioni tematiche basate sulle parole chiave esistenti per facilitare la navigazione del grafo.
    ${fileUrl ? '\nAnalizza anche il contenuto del file (se immagine o documento accessibile) fornito nel link sopra.' : ''}
    
    Restituisci la risposta esclusivamente in formato JSON.
    NON includere alcuna formattazione markdown (nessun blocco di codice come \`\`\`json ... \`\`\`) o commenti.
    Restituisci solo l'oggetto JSON strutturato.
  `;

  const text = await callAI([{role: 'user', content: prompt}], false, onProgress);
  const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonText || "{}");
}

export async function generateTitle(content: string, onProgress?: (p: number) => void): Promise<string> {
  return await callAI([{role: 'user', content: `Genera un titolo breve, descrittivo e accattivante (max 3 parole) per il seguente contenuto, in ITALIANO:\n\n${content}`}], false, onProgress);
}

export async function askSecondBrain(question: string, context: string, onProgress?: (p: number) => void): Promise<string> {
  const prompt = `
    Sei un assistente AI "Second Brain". 
    Usa i seguenti frammenti di contesto indicizzato per rispondere alla domanda dell'utente in ITALIANO.
    Se il contesto non contiene la risposta, dillo educatamente all'utente, ma prova a trovare connessioni rilevanti se possibile.
    
    Domanda: ${question}
    
    Contesto:
    ${context}
  `;

  return await callAI([{role: 'user', content: prompt}], true, onProgress);
}
