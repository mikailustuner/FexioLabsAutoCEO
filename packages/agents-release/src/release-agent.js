export class ReleaseAgent {
    name = "Release Agent";
    async run(input, context) {
        context.logger.info(`Release Agent generating release notes for ${input.project.name} v${input.version}`);
        const doneTasks = input.tasks.filter((t) => t.status === "DONE");
        const inProgressTasks = input.tasks.filter((t) => t.status === "IN_PROGRESS");
        if (context.llm && doneTasks.length > 0) {
            try {
                const taskList = doneTasks.map((t) => `- ${t.title}`).join("\n");
                const prompt = `Bir Release Manager olarak şu release için release notes oluştur:

Proje: ${input.project.name}
Versiyon: ${input.version}
Tamamlanan Tasklar:
${taskList}

Türkçe, casual-profesyonel tonla, kullanıcı dostu bir release notes yaz. Markdown formatında, şu bölümleri içersin:
- Başlık ve versiyon
- Yeni Özellikler
- İyileştirmeler
- Düzeltmeler (varsa)

Format: Markdown text`;
                const releaseNotes = await context.llm.generate({ prompt, temperature: 0.7 });
                const changelog = doneTasks.map((t) => t.title);
                return {
                    releaseNotes,
                    version: input.version,
                    changelog,
                };
            }
            catch (error) {
                context.logger.warn("LLM release notes generation failed, using template", { error });
            }
        }
        return this.generateReleaseNotesTemplate(input, doneTasks, inProgressTasks);
    }
    generateReleaseNotesTemplate(input, doneTasks, inProgressTasks) {
        const changelog = doneTasks.map((t) => t.title);
        let releaseNotes = `# ${input.project.name} v${input.version}\n\n`;
        releaseNotes += `**Yayın Tarihi:** ${new Date().toLocaleDateString("tr-TR")}\n\n`;
        if (doneTasks.length > 0) {
            releaseNotes += `## 🎉 Yeni Özellikler\n\n`;
            doneTasks.forEach((task, index) => {
                releaseNotes += `${index + 1}. ${task.title}\n`;
                if (task.description) {
                    releaseNotes += `   - ${task.description}\n`;
                }
            });
            releaseNotes += `\n`;
        }
        if (inProgressTasks.length > 0) {
            releaseNotes += `## 🚧 Devam Eden İşler\n\n`;
            releaseNotes += `Aşağıdaki özellikler yakında gelecek:\n\n`;
            inProgressTasks.slice(0, 5).forEach((task) => {
                releaseNotes += `- ${task.title}\n`;
            });
            releaseNotes += `\n`;
        }
        releaseNotes += `## 📝 Notlar\n\n`;
        releaseNotes += `Bu release ile ${doneTasks.length} yeni özellik ve iyileştirme sunuyoruz. `;
        releaseNotes += `Geri bildirimleriniz bizim için çok değerli!\n`;
        return {
            releaseNotes,
            version: input.version,
            changelog,
        };
    }
}
//# sourceMappingURL=release-agent.js.map