export class QAAgent {
    name = "QA Agent";
    async run(input, context) {
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
        const completionRate = (doneTasks.length / totalTasks) * 100;
        const blockedRate = (blockedTasks.length / totalTasks) * 100;
        let qualityScore = completionRate;
        qualityScore -= blockedRate * 10;
        qualityScore = Math.max(0, Math.min(100, qualityScore));
        const testSuggestions = [];
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
        let assessment = "";
        if (qualityScore >= 90) {
            assessment = `Kalite kontrolü: Mükemmel. ${completionRate.toFixed(0)}% task tamamlanmış, blok yok. Release için hazır görünüyor.`;
        }
        else if (qualityScore >= 70) {
            assessment = `Kalite kontrolü: İyi. ${completionRate.toFixed(0)}% task tamamlanmış. ${blockedTasks.length > 0 ? `${blockedTasks.length} bloklu task var,` : ""} küçük iyileştirmelerle release yapılabilir.`;
        }
        else if (qualityScore >= 50) {
            assessment = `Kalite kontrolü: Orta. ${completionRate.toFixed(0)}% task tamamlanmış. ${blockedTasks.length > 0 ? `${blockedTasks.length} bloklu task` : "Eksikler"} var, release öncesi dikkatli değerlendirme gerekli.`;
        }
        else {
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
//# sourceMappingURL=qa-agent.js.map