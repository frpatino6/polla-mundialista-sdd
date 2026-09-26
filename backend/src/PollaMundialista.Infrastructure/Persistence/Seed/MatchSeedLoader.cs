using System.Text.Json;
using System.Text.Json.Serialization;

namespace PollaMundialista.Infrastructure.Persistence.Seed;

public static class MatchSeedLoader
{
    private const string RelativeFixturePath = "docs/fixtures/matches-seed.json";
    private const int MaxDirectoryDepth = 10;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public static IReadOnlyList<MatchSeedEntry> LoadFromRepoFixture()
    {
        var fixturePath = ResolveFixturePath();
        var json = File.ReadAllText(fixturePath);

        var entries = JsonSerializer.Deserialize<List<MatchSeedEntry>>(json, SerializerOptions);

        return entries ?? [];
    }

    private static string ResolveFixturePath()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        for (var depth = 0; depth <= MaxDirectoryDepth && directory is not null; depth++)
        {
            var candidate = Path.Combine(directory.FullName, RelativeFixturePath);
            if (File.Exists(candidate))
                return candidate;

            directory = directory.Parent;
        }

        throw new FileNotFoundException(
            $"No se encontró '{RelativeFixturePath}' subiendo desde '{AppContext.BaseDirectory}' " +
            $"(límite de {MaxDirectoryDepth} niveles).");
    }
}
