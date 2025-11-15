export interface LLMClient {
  generate(params: { prompt: string; temperature?: number }): Promise<string>;
}

export class GeminiLLMClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey?: string, baseUrl = "https://generativelanguage.googleapis.com/v1beta", model = "gemini-pro") {
    this.apiKey = apiKey || "";
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(params: { prompt: string; temperature?: number }): Promise<string> {
    if (!this.apiKey) {
      // Mock response when no API key is provided
      return `[Mock LLM Response] Generated response for prompt: ${params.prompt.substring(0, 50)}...`;
    }

    try {
      // Gemini API uses generateContent endpoint
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: params.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: params.temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No text in Gemini API response");
      }

      return text;
    } catch (error) {
      // Fallback to mock on error
      console.warn("Gemini API call failed, using mock response:", error);
      return `[Mock LLM Response] Generated response for prompt: ${params.prompt.substring(0, 50)}...`;
    }
  }
}

export class OpenAILLMClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl = "https://api.openai.com/v1") {
    this.apiKey = apiKey || "";
    this.baseUrl = baseUrl;
  }

  async generate(params: { prompt: string; temperature?: number }): Promise<string> {
    if (!this.apiKey) {
      // Mock response when no API key is provided
      return `[Mock LLM Response] Generated response for prompt: ${params.prompt.substring(0, 50)}...`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [{ role: "user", content: params.prompt }],
          temperature: params.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0]?.message?.content || "";
    } catch (error) {
      // Fallback to mock on error
      console.warn("LLM API call failed, using mock response:", error);
      return `[Mock LLM Response] Generated response for prompt: ${params.prompt.substring(0, 50)}...`;
    }
  }
}

