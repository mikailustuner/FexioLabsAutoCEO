import type { Agent, AgentContext } from "@flao/core";

export interface CEOAgentInput {
  name: string;
  description: string;
  goals?: string[];
  marketInfo?: {
    targetAudience?: string;
    marketSize?: string;
    competition?: string;
  };
}

export interface CEOAgentOutput {
  approved: boolean;
  priority: number; // 1-10 scale
  rationale: string;
}

export class CEOAgent implements Agent<CEOAgentInput, CEOAgentOutput> {
  name = "CEO Agent";

  async run(input: CEOAgentInput, context: AgentContext): Promise<CEOAgentOutput> {
    context.logger.info(`CEO Agent evaluating project: ${input.name}`);

    // Use LLM if available for more sophisticated analysis
    if (context.llm) {
      try {
        const prompt = `Bir startup CEO'su olarak şu projeyi değerlendir:

Proje Adı: ${input.name}
Açıklama: ${input.description}
Hedefler: ${input.goals?.join(", ") || "Belirtilmemiş"}
Pazar Bilgisi: ${JSON.stringify(input.marketInfo || {})}

Türkçe, casual-profesyonel bir tonla şunları içeren bir değerlendirme yap:
1. Projenin stratejik uygunluğu (onaylanmalı mı?)
2. Öncelik seviyesi (1-10 arası)
3. Kısa bir gerekçe

Format: JSON olarak {"approved": true/false, "priority": 1-10, "rationale": "açıklama"}`;

        const response = await context.llm.generate({ prompt, temperature: 0.7 });
        
        // Try to parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as CEOAgentOutput;
          if (parsed.approved !== undefined && parsed.priority && parsed.rationale) {
            return parsed;
          }
        }
      } catch (error) {
        context.logger.warn("LLM evaluation failed, using rule-based logic", { error });
      }
    }

    // Fallback to rule-based logic
    return this.evaluateRuleBased(input);
  }

  private evaluateRuleBased(input: CEOAgentInput): CEOAgentOutput {
    let approved = true;
    let priority = 5; // Default medium priority
    const reasons: string[] = [];

    // Check if description is meaningful
    if (!input.description || input.description.length < 20) {
      approved = false;
      reasons.push("Proje açıklaması yetersiz");
    }

    // Check if goals are defined
    if (input.goals && input.goals.length > 0) {
      priority += 1;
      reasons.push("Hedefler net tanımlanmış");
    } else {
      reasons.push("Hedefler belirsiz, netleştirilmeli");
    }

    // Market info increases priority
    if (input.marketInfo?.targetAudience) {
      priority += 1;
      reasons.push("Hedef kitle tanımlı");
    }

    if (input.marketInfo?.marketSize) {
      priority += 1;
      reasons.push("Pazar analizi yapılmış");
    }

    // Ensure priority is within bounds
    priority = Math.max(1, Math.min(10, priority));

    const rationale = approved
      ? `Proje onaylandı. Öncelik: ${priority}/10. ${reasons.join(". ")}. Stratejik hedeflerle uyumlu görünüyor, ilerleyebiliriz.`
      : `Proje onaylanmadı. ${reasons.join(". ")}. Önce bu konuları netleştirmemiz gerekiyor.`;

    return {
      approved,
      priority,
      rationale,
    };
  }
}

