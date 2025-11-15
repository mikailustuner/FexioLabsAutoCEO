import type { Agent, AgentContext } from "@flao/core";
import type { Project, Task } from "@flao/db";

export interface QAAgentInput {
  project: Project;
  tasks: Task[];
}

export interface QAAgentOutput {
  assessment: string;
  testSuggestions: string[];
  qualityScore: number; // 0-100
  readyForRelease: boolean;
}

export class QAAgent implements Agent<QAAgentInput, QAAgentOutput> {
  name = "QA Agent";

  async run(input: QAAgentInput, context: AgentContext): Promise<QAAgentOutput> {
    context.logger.info(`QA Agent assessing quality for project: ${input.project.id}`);

    const totalTasks = input.tasks.length;
    const doneTasks = input.tasks.filter((t) => t.status === "DONE");
    const inProgressTasks = input.tasks.filter((t) => t.status === "IN_PROGRESS");
    const blockedTasks = input.tasks.filter((t) => t.status === "BLOCKED");
    const reviewTasks = input.tasks.filter((t) => t.status === "REVIEW");

    if (totalTasks === 0) {
      return {
        assessment: "Henüz task yok, kalite değerlendirmesi yapılamıyor.",
        testSuggestions: [],
        qualityScore: 0,
        readyForRelease: false,
      };
    }

    // Calculate quality score
    const completionRate = (doneTasks.length / totalTasks) * 100;
    const blockedRate = (blockedTasks.length / totalTasks) * 100;
    
    let qualityScore = completionRate;
    qualityScore -= blockedRate * 10; // Penalize blocked tasks
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // Generate test suggestions
    const testSuggestions: string[] = [];

    if (doneTasks.length > 0) {
      testSuggestions.push("Tamamlanan tasklar için regression testleri çalıştırılmalı");
    }

    if (reviewTasks.length > 0) {
      testSuggestions.push(`${reviewTasks.length} task review aşamasında, code review tamamlanmalı`);
    }

    if (blockedTasks.length > 0) {
      testSuggestions.push(`${blockedTasks.length} bloklu task var, çözülmesi gerekiyor`);
    }

    if (inProgressTasks.length > totalTasks * 0.5) {
      testSuggestions.push("Çok fazla task devam ediyor, odaklanma sorunu olabilir");
    }

    // Generate assessment
    let assessment = "";
    if (qualityScore >= 90) {
      assessment = `Kalite kontrolü: Mükemmel. ${completionRate.toFixed(0)}% task tamamlanmış, blok yok. Release için hazır görünüyor.`;
    } else if (qualityScore >= 70) {
      assessment = `Kalite kontrolü: İyi. ${completionRate.toFixed(0)}% task tamamlanmış. ${blockedTasks.length > 0 ? `${blockedTasks.length} bloklu task var,` : ""} küçük iyileştirmelerle release yapılabilir.`;
    } else if (qualityScore >= 50) {
      assessment = `Kalite kontrolü: Orta. ${completionRate.toFixed(0)}% task tamamlanmış. ${blockedTasks.length > 0 ? `${blockedTasks.length} bloklu task` : "Eksikler"} var, release öncesi dikkatli değerlendirme gerekli.`;
    } else {
      assessment = `Kalite kontrolü: Düşük. ${completionRate.toFixed(0)}% task tamamlanmış. ${blockedTasks.length > 0 ? `${blockedTasks.length} bloklu task` : "Önemli eksikler"} var, release önerilmiyor.`;
    }

    const readyForRelease = qualityScore >= 70 && blockedTasks.length === 0;

    return {
      assessment,
      testSuggestions,
      qualityScore: Math.round(qualityScore),
      readyForRelease,
    };
  }
}

