import type { Agent, AgentContext } from "@flao/core";

export interface ClientAgentInput {
  rawBrief: string;
  clientInfo?: {
    name?: string;
    email?: string;
    company?: string;
  };
}

export interface ClientAgentOutput {
  refinedDescription: string;
  goals: string[];
  requirements: string[];
  estimatedScope: "small" | "medium" | "large";
}

export class ClientAgent implements Agent<ClientAgentInput, ClientAgentOutput> {
  name = "Client Agent";

  async run(input: ClientAgentInput, context: AgentContext): Promise<ClientAgentOutput> {
    context.logger.info("Client Agent refining brief");

    // Use LLM if available for better brief refinement
    if (context.llm) {
      try {
        const prompt = `Bir Client Relations Manager olarak şu müşteri brief'ini analiz et ve düzenle:

Müşteri Bilgileri: ${JSON.stringify(input.clientInfo || {})}
Ham Brief: ${input.rawBrief}

Türkçe, profesyonel ama samimi bir tonla şunları içeren bir çıktı oluştur:
1. Düzenlenmiş, net proje açıklaması
2. Proje hedefleri (liste)
3. Gereksinimler (liste)
4. Tahmini kapsam (small/medium/large)

Format: JSON olarak {"refinedDescription": "...", "goals": [...], "requirements": [...], "estimatedScope": "small|medium|large"}`;

        const response = await context.llm.generate({ prompt, temperature: 0.6 });
        
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ClientAgentOutput;
          if (parsed.refinedDescription && parsed.goals) {
            return parsed;
          }
        }
      } catch (error) {
        context.logger.warn("LLM brief refinement failed, using rule-based logic", { error });
      }
    }

    // Fallback to rule-based refinement
    return this.refineBriefRuleBased(input);
  }

  private refineBriefRuleBased(input: ClientAgentInput): ClientAgentOutput {
    // Clean up the brief
    let refinedDescription = input.rawBrief.trim();
    
    // Add client context if available
    if (input.clientInfo?.name) {
      refinedDescription = `${input.clientInfo.name}${input.clientInfo.company ? ` (${input.clientInfo.company})` : ""} için: ${refinedDescription}`;
    }

    // Extract goals (simple keyword-based)
    const goals: string[] = [];
    const briefLower = input.rawBrief.toLowerCase();

    if (briefLower.includes("mvp") || briefLower.includes("minimum")) {
      goals.push("MVP geliştirme ve lansman");
    }

    if (briefLower.includes("kullanıcı") || briefLower.includes("user")) {
      goals.push("Kullanıcı deneyimini optimize etme");
    }

    if (briefLower.includes("gelir") || briefLower.includes("revenue") || briefLower.includes("satış")) {
      goals.push("Gelir artışı sağlama");
    }

    if (goals.length === 0) {
      goals.push("Proje hedeflerini gerçekleştirme");
    }

    // Extract requirements
    const requirements: string[] = [];
    
    if (briefLower.includes("mobil") || briefLower.includes("mobile") || briefLower.includes("app")) {
      requirements.push("Mobil uygulama geliştirme");
    }

    if (briefLower.includes("web") || briefLower.includes("website")) {
      requirements.push("Web platformu geliştirme");
    }

    if (briefLower.includes("backend") || briefLower.includes("api")) {
      requirements.push("Backend API geliştirme");
    }

    if (briefLower.includes("tasarım") || briefLower.includes("design") || briefLower.includes("ui")) {
      requirements.push("UI/UX tasarım");
    }

    if (requirements.length === 0) {
      requirements.push("Proje gereksinimleri analiz edilecek");
    }

    // Estimate scope based on brief length and keywords
    let estimatedScope: "small" | "medium" | "large" = "medium";
    const wordCount = input.rawBrief.split(/\s+/).length;
    
    if (wordCount < 50) {
      estimatedScope = "small";
    } else if (wordCount > 200 || briefLower.includes("kapsamlı") || briefLower.includes("comprehensive")) {
      estimatedScope = "large";
    }

    return {
      refinedDescription,
      goals,
      requirements,
      estimatedScope,
    };
  }
}
