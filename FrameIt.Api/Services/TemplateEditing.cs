using FrameIt.Api.Data;
using FrameIt.Contracts;

namespace FrameIt.Api.Services;

public static class TemplateEditing
{
    public static void Apply(AppDbContext db, DynamicTemplate template, CreateTemplateRequest request)
    {
        var replacement = request.ToEntity();
        template.Key = replacement.Key;
        template.Title = replacement.Title;
        template.Objective = replacement.Objective;
        template.Audience = replacement.Audience;
        template.FacilitatorGuidance = replacement.FacilitatorGuidance;
        template.UpdatedAtUtc = DateTimeOffset.UtcNow;
        db.Set<TemplateSection>().RemoveRange(template.Sections);
        template.Sections = replacement.Sections;
        // New children have preassigned GUIDs. Explicitly insert them; navigation
        // discovery otherwise treats generated-key entities as existing rows.
        db.Set<TemplateSection>().AddRange(template.Sections);
    }
}
