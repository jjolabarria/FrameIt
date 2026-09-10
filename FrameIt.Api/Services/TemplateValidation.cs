using FrameIt.Contracts;

namespace FrameIt.Api.Services;

public static class TemplateValidation
{
    public static string? Validate(CreateTemplateRequest? draft)
    {
        static bool Text(string? s, int max) => !string.IsNullOrWhiteSpace(s) && s.Length <= max;
        if (draft is null || !Text(draft.Key, 80) || !Text(draft.Title, 200) || !Text(draft.Objective, 6000)
            || !Text(draft.Audience, 2000) || draft.FacilitatorGuidance?.Length > 12000)
            return "Completa título, clave, objetivo y audiencia dentro de los límites de longitud.";
        if (draft.Sections is null || draft.Sections.Count is < 1 or > 20 || draft.Sections.Any(s => s is null || s.Questions is null)
            || draft.Sections.Sum(s => s.Questions.Count) > 100)
            return "La plantilla debe contener entre 1 y 20 bloques y un máximo de 100 preguntas.";
        var sectionKeys = new HashSet<string>();
        var questionKeys = new HashSet<string>();
        foreach (var section in draft.Sections)
        {
            if (!Text(section.Key, 160) || !sectionKeys.Add(section.Key) || !Text(section.Title, 300)
                || !Text(section.Objective, 6000) || section.Order < 1 || section.Questions.Count == 0)
                return "Cada bloque necesita clave única, título, objetivo y al menos una pregunta.";
            foreach (var question in section.Questions)
            {
                if (question is null || !Text(question.Key, 160) || !questionKeys.Add(question.Key) || !Text(question.Title, 300)
                    || !Text(question.Prompt, 6000) || !Enum.IsDefined(question.Kind) || question.Options is null || question.Options.Count > 50)
                    return "Revisa las claves, enunciados y tipos de pregunta.";
                if (question.Kind is QuestionKind.Choice or QuestionKind.Voting or QuestionKind.Ranking or QuestionKind.ColumnSort or QuestionKind.Matrix
                    && question.Options.Count < 2) return "Las preguntas con opciones necesitan al menos dos opciones.";
                if (question.Options.Any(o => o is null || !Text(o.Id, 160) || !Text(o.Label, 1000) || o.Description?.Length > 3000)
                    || question.Options.Select(o => o.Id).Distinct().Count() != question.Options.Count)
                    return "Las opciones necesitan identificadores únicos y texto.";
                var p = question.Presentation;
                if (p is null || p.TimerSeconds is < 0 or > 86400 || !Enum.IsDefined(p.ResponseVisibility)
                    || !Enum.IsDefined(p.ResponseIdentityMode) || !Enum.IsDefined(p.CelebrationStyle))
                    return "La configuración de presentación de una pregunta no es válida.";
                if (question.Settings is { } settings && (settings.Count > 50 || settings.Any(x => !Text(x.Key, 160) || x.Value is null || x.Value.Length > 6000)))
                    return "Los ajustes adicionales de una pregunta no son válidos.";
            }
        }
        return null;
    }
}
