import type { Agent, AgentContext } from "@flao/core";

export interface FeatureSpec {
  name: string;
  description: string;
}

export interface CTOAgentInput {
  projectId: string;
  features: FeatureSpec[];
}

export interface CTOAgentOutput {
  architecture: string;
  techStack: string[];
  constraints: string[];
  recommendations: string;
}

export class CTOAgent implements Agent<CTOAgentInput, CTOAgentOutput> {
  name = "CTO Agent";

  async run(input: CTOAgentInput, context: AgentContext): Promise<CTOAgentOutput> {
    context.logger.info(`CTO Agent providing architecture for project: ${input.projectId}`);

    // Use LLM if available
    if (context.llm) {
      try {
        const prompt = `Bir CTO olarak şu proje için teknik mimari öner:

Proje ID: ${input.projectId}
Özellikler: ${input.features.map((f) => `${f.name}: ${f.description}`).join(", ")}

Türkçe, casual-profesyonel tonla şunları içeren bir değerlendirme yap:
1. Mimari yaklaşım (monolitik, mikroservis, serverless, vb.)
2. Teknoloji stack önerileri
3. Teknik kısıtlar ve dikkat edilmesi gerekenler
4. Genel öneriler

Format: JSON olarak {"architecture": "...", "techStack": [...], "constraints": [...], "recommendations": "..."}`;

        const response = await context.llm.generate({ prompt, temperature: 0.6 });
        
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as CTOAgentOutput;
          if (parsed.architecture && parsed.techStack) {
            return parsed;
          }
        }
      } catch (error) {
        context.logger.warn("LLM architecture generation failed, using rule-based logic", { error });
      }
    }

    // Fallback to rule-based recommendations
    return this.generateArchitectureRuleBased(input);
  }

  private generateArchitectureRuleBased(input: CTOAgentInput): CTOAgentOutput {
    const featureCount = input.features.length;
    const hasRealTimeFeatures = input.features.some((f) =>
      f.description.toLowerCase().includes("mesaj") || 
      f.description.toLowerCase().includes("chat") ||
      f.description.toLowerCase().includes("realtime") ||
      f.description.toLowerCase().includes("real-time")
    );
    const hasPaymentFeatures = input.features.some((f) =>
      f.description.toLowerCase().includes("ödeme") || 
      f.description.toLowerCase().includes("payment") ||
      f.description.toLowerCase().includes("payout")
    );

    // Determine architecture based on complexity
    let architecture = "Monolitik mimari";
    if (featureCount > 10) {
      architecture = "Mikroservis mimarisi öneriliyor";
    } else if (hasRealTimeFeatures) {
      architecture = "Event-driven mimari ile mikroservis yaklaşımı";
    }

    // Tech stack recommendations
    const techStack: string[] = ["TypeScript", "Node.js", "PostgreSQL"];

    if (hasRealTimeFeatures) {
      techStack.push("WebSocket", "Redis");
    }

    if (input.features.some((f) => f.description.toLowerCase().includes("mobil"))) {
      techStack.push("React Native");
    } else {
      techStack.push("React");
    }

    if (hasPaymentFeatures) {
      techStack.push("Stripe API");
    }

    // Constraints
    const constraints: string[] = [];

    if (hasPaymentFeatures) {
      constraints.push("Ödeme güvenliği kritik, PCI-DSS uyumluluğu gerekli");
    }

    if (hasRealTimeFeatures) {
      constraints.push("Düşük latency gereksinimi var, WebSocket bağlantı yönetimi önemli");
    }

    if (featureCount > 5) {
      constraints.push("Ölçeklenebilirlik dikkate alınmalı, caching stratejisi gerekli");
    }

    const recommendations = `Proje ${featureCount} özellik içeriyor. ${architecture} yaklaşımı uygun görünüyor. ${constraints.length > 0 ? "Dikkat edilmesi gerekenler: " + constraints.join(". ") : "Temel best practice'lere uyulması yeterli."}`;

    return {
      architecture,
      techStack,
      constraints,
      recommendations,
    };
  }
}
