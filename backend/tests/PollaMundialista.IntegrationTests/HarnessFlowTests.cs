using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.IntegrationTests;

public class HarnessFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    // MatchDto.Group es MatchGroup (enum) y el servidor lo serializa como string vía
    // ConfigureHttpJsonOptions (Program.cs); GetFromJsonAsync usa opciones "web defaults" por
    // separado, así que hay que replicar el mismo JsonStringEnumConverter en el cliente de test.
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly CustomWebApplicationFactory _factory;

    public HarnessFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetMatches_Returns12SeededMatches()
    {
        var client = _factory.CreateClient();
        var (_, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(client, token);

        var matches = await client.GetFromJsonAsync<List<MatchDto>>("/api/matches", JsonOptions);

        Assert.NotNull(matches);
        Assert.Equal(12, matches!.Count);
    }

    [Fact]
    public async Task HappyPath_PredictionMatchesActualResult_LeaderboardAwards3Points()
    {
        var client = _factory.CreateClient();
        var (userId, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        var (_, adminToken) = await TestAuthHelper.SeedAdminAndLoginAsync(_factory, client, $"admin-{Guid.NewGuid():N}@test.com", "Password123");

        TestAuthHelper.AttachToken(client, token);
        var matches = await client.GetFromJsonAsync<List<MatchDto>>("/api/matches", JsonOptions);
        var match = matches!.First(m => m.HomeTeam == "Argentina" && m.AwayTeam == "Brasil");

        var predictionResponse = await client.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 2, PredictedAwayScore: 1));
        Assert.True(predictionResponse.IsSuccessStatusCode);

        TestAuthHelper.AttachToken(client, adminToken);
        var resultResponse = await client.PutAsJsonAsync($"/api/admin/matches/{match.Id}/result",
            new MatchResultRequest(HomeScore: 2, AwayScore: 1));
        Assert.True(resultResponse.IsSuccessStatusCode);

        var leaderboard = await client.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard");
        var entry = leaderboard!.Single(e => e.UserId == userId);

        Assert.Equal(3, entry.TotalPoints);
    }

    [Fact]
    public async Task PendingMatch_WithoutRealResult_AwardsZeroPointsWithoutError()
    {
        var client = _factory.CreateClient();
        var (userId, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(client, token);

        var matches = await client.GetFromJsonAsync<List<MatchDto>>("/api/matches", JsonOptions);
        var match = matches!.First(m => m.HomeTeam == "España" && m.AwayTeam == "Francia");

        var predictionResponse = await client.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 1, PredictedAwayScore: 0));
        Assert.True(predictionResponse.IsSuccessStatusCode);

        var leaderboard = await client.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard");
        var entry = leaderboard!.SingleOrDefault(e => e.UserId == userId);

        Assert.True(entry is null || entry.TotalPoints == 0);
    }

    [Fact]
    public async Task CorrectingAnAlreadyLoadedResult_RecalculatesInsteadOfAccumulating()
    {
        var client = _factory.CreateClient();
        var (userId, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        var (_, adminToken) = await TestAuthHelper.SeedAdminAndLoginAsync(_factory, client, $"admin-{Guid.NewGuid():N}@test.com", "Password123");

        TestAuthHelper.AttachToken(client, token);
        var matches = await client.GetFromJsonAsync<List<MatchDto>>("/api/matches", JsonOptions);
        var match = matches!.First(m => m.HomeTeam == "Argentina" && m.AwayTeam == "España");

        await client.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 1, PredictedAwayScore: 0));

        TestAuthHelper.AttachToken(client, adminToken);

        // Primera carga de resultado: coincide exacto -> 3 pts.
        await client.PutAsJsonAsync($"/api/admin/matches/{match.Id}/result",
            new MatchResultRequest(HomeScore: 1, AwayScore: 0));

        var leaderboardAfterFirstLoad = await client.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard");
        Assert.Equal(3, leaderboardAfterFirstLoad!.Single(e => e.UserId == userId).TotalPoints);

        // Repetir el mismo resultado debe ser idempotente (no acumula puntos).
        await client.PutAsJsonAsync($"/api/admin/matches/{match.Id}/result",
            new MatchResultRequest(HomeScore: 1, AwayScore: 0));

        var leaderboardAfterRepeat = await client.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard");
        Assert.Equal(3, leaderboardAfterRepeat!.Single(e => e.UserId == userId).TotalPoints);

        // Corregir con un marcador distinto (cambia el signo) sobrescribe los puntos, no los suma.
        await client.PutAsJsonAsync($"/api/admin/matches/{match.Id}/result",
            new MatchResultRequest(HomeScore: 2, AwayScore: 2));

        var leaderboardAfterCorrection = await client.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard");
        Assert.Equal(0, leaderboardAfterCorrection!.Single(e => e.UserId == userId).TotalPoints);
    }
}
