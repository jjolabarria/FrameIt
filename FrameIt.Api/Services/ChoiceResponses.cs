using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Contracts;

namespace FrameIt.Api.Services;

public static class ChoiceResponses
{
    public static bool Multiple(IReadOnlyDictionary<string, string> settings)
        => settings.TryGetValue("selectionMode", out var mode) && mode == "multiple";

    public static string? SettingsError(IReadOnlyDictionary<string, string> settings)
    {
        if (settings.TryGetValue("selectionMode", out var mode) && mode is not ("" or "single" or "multiple"))
            return "Elige selección única o múltiple.";
        if (Multiple(settings) && settings.TryGetValue("maxSelections", out var maximum) && maximum != ""
            && (maximum.Any(c => !char.IsAsciiDigit(c)) || !int.TryParse(maximum, out var limit) || limit is < 1 or > 50))
            return "El máximo de opciones debe estar entre 1 y 50, o vacío para permitir todas.";
        return null;
    }

    public static IReadOnlyList<string>? SelectedIds(string value, IReadOnlyList<QuestionOptionDto> options)
    {
        var legacy = options.FirstOrDefault(option => option.Label.Trim() == value.Trim());
        if (legacy is not null) return [legacy.Id];
        try
        {
            using var document = JsonDocument.Parse(value);
            if (document.RootElement.ValueKind != JsonValueKind.Object
                || !document.RootElement.TryGetProperty("selectedOptionIds", out var array) || array.ValueKind != JsonValueKind.Array) return null;
            var ids = new List<string>();
            foreach (var item in array.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.String || item.GetString() is not { } id
                    || ids.Contains(id) || !options.Any(option => option.Id == id)) return null;
                ids.Add(id);
            }
            return ids;
        }
        catch (JsonException) { return null; }
    }

    public static string? Validate(SessionQuestion question, string value)
    {
        var options = TemplateMapper.DeserializeOptions(question.OptionsJson);
        var settings = TemplateMapper.DeserializeSettings(question.SettingsJson);
        if (SettingsError(settings) is { } error) return error;
        if (!Multiple(settings)) return options.Any(option => option.Label.Trim() == value.Trim()) ? null : "Selecciona una de las opciones disponibles.";
        var selected = SelectedIds(value.Trim(), options);
        if (selected is null || selected.Count == 0) return "Selecciona al menos una opción válida, sin repetir opciones.";
        var limit = settings.TryGetValue("maxSelections", out var raw) && int.TryParse(raw, out var maximum) ? Math.Min(maximum, options.Count) : options.Count;
        return selected.Count <= limit ? null : $"Puedes seleccionar como máximo {limit} opciones.";
    }

    public static bool Matches(SessionQuestion question, string value, QuestionOptionDto option)
        => question.Kind == QuestionKind.Choice ? SelectedIds(value, TemplateMapper.DeserializeOptions(question.OptionsJson))?.Contains(option.Id) == true
            : string.Equals(value, option.Label, StringComparison.OrdinalIgnoreCase);

    public static string Format(SessionQuestion question, string value)
    {
        if (question.Kind != QuestionKind.Choice) return value;
        var options = TemplateMapper.DeserializeOptions(question.OptionsJson);
        var selected = SelectedIds(value, options);
        return selected is null ? value : string.Join("\n", options.Where(option => selected.Contains(option.Id)).Select(option => option.Label));
    }
}
