import type { Agent, AgentContext } from "@flao/core";

export interface FeatureSpec {
  name: string;
  description: string;
  priority: number; // 1-5, where 1 is highest
  estimatedHours?: number;
}

export interface ProductAgentInput {
  projectId: string;
  description: string;
  goals: string[];
}

export interface ProductAgentOutput {
  features: FeatureSpec[];
  mvpFeatures: FeatureSpec[];
}

export class ProductAgent implements Agent<ProductAgentInput, ProductAgentOutput> {
  name = "Product Agent";

  async run(input: ProductAgentInput, context: AgentContext): Promise<ProductAgentOutput> {
    context.logger.info(`Product Agent breaking down features for project: ${input.projectId}`);

    // Use LLM if available for feature generation
    if (context.llm) {
      try {
        const prompt = `Bir Product Manager olarak şu proje için özellik listesi oluştur:

Proje Açıklaması: ${input.description}
Hedefler: ${input.goals.join(", ")}

Türkçe, casual-profesyonel tonla:
1. Tüm özellikleri listele (her biri için: isim, açıklama, öncelik 1-5)
2. MVP için gerekli minimum özellikleri belirle

Format: JSON array olarak [{"name": "...", "description": "...", "priority": 1-5}]`;

        const response = await context.llm.generate({ prompt, temperature: 0.7 });
        
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as FeatureSpec[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mvpFeatures = parsed.filter((f) => f.priority <= 2);
            return {
              features: parsed,
              mvpFeatures: mvpFeatures.length > 0 ? mvpFeatures : parsed.slice(0, 3),
            };
          }
        }
      } catch (error) {
        context.logger.warn("LLM feature generation failed, using rule-based logic", { error });
      }
    }

    // Fallback to rule-based feature breakdown
    return this.generateFeaturesRuleBased(input);
  }

  private generateFeaturesRuleBased(input: ProductAgentInput): ProductAgentOutput {
    // Basic feature breakdown based on common patterns
    const features: FeatureSpec[] = [
      {
        name: "Kullanıcı Kimlik Doğrulama",
        description: "Email/şifre ile kayıt ve giriş sistemi",
        priority: 1,
        estimatedHours: 16,
      },
      {
        name: "Ana Dashboard",
        description: "Kullanıcının ana sayfa görünümü ve navigasyon",
        priority: 1,
        estimatedHours: 24,
      },
      {
        name: "Profil Yönetimi",
        description: "Kullanıcı profil bilgilerini görüntüleme ve düzenleme",
        priority: 2,
        estimatedHours: 12,
      },
      {
        name: "Ayarlar",
        description: "Uygulama ayarları ve tercihler",
        priority: 3,
        estimatedHours: 8,
      },
    ];

    // Add project-specific features based on description keywords
    const descLower = input.description.toLowerCase();
    if (descLower.includes("sosyal") || descLower.includes("paylaş")) {
      features.push({
        name: "İçerik Paylaşımı",
        description: "Kullanıcıların içerik paylaşması ve görüntülemesi",
        priority: 1,
        estimatedHours: 32,
      });
    }

    if (descLower.includes("mesaj") || descLower.includes("chat")) {
      features.push({
        name: "Mesajlaşma",
        description: "Kullanıcılar arası mesajlaşma özelliği",
        priority: 2,
        estimatedHours: 40,
      });
    }

    if (descLower.includes("ödeme") || descLower.includes("satın")) {
      features.push({
        name: "Ödeme Sistemi",
        description: "Güvenli ödeme entegrasyonu",
        priority: 1,
        estimatedHours: 48,
      });
    }

    // MVP features are priority 1-2
    const mvpFeatures = features.filter((f) => f.priority <= 2);

    return {
      features,
      mvpFeatures: mvpFeatures.length > 0 ? mvpFeatures : features.slice(0, 2),
    };
  }
}
