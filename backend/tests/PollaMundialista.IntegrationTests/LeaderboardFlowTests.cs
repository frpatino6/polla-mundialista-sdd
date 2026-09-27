using System.Net;
using System.Net.Http.Json;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.IntegrationTests;

public class LeaderboardFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public LeaderboardFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Leaderboard_OrdersByTotalPoints_ThenExactPredictions_ThenEmail()
    {
        var adminClient = _factory.CreateClient();
        var (_, adminToken) = await TestAuthHelper.SeedAdminAndLoginAsync(
            _factory, adminClient, $"admin-{Guid.NewGuid():N}@test.com", "Password123");

        TestAuthHelper.AttachToken(adminClient, adminToken);
        var matches = await adminClient.GetFromJsonAsync<List<MatchDto>>("/api/matches", TestAuthHelper.JsonOptions)
            ?? throw new InvalidOperationException("Se esperaban partidos sembrados.");

        // userExact: 1 marcador exacto -> 3 puntos totales.
        var exactClient = _factory.CreateClient();
        var exactEmail = "a1-exact@test.com";
        var (exactUserId, exactToken) = await TestAuthHelper.RegisterAndLoginAsync(exactClient, exactEmail, "Password123");
        TestAuthHelper.AttachToken(exactClient, exactToken);
        var exactMatch = matches.First(m => m.HomeTeam == "Argentina" && m.AwayTeam == "Brasil");
        await exactClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(exactMatch.Id, PredictedHomeScore: 2, PredictedAwayScore: 1));

        // userAlphaTie: 1 marcador exacto -> 3 puntos totales (empata con exact y con zetaTie).
        var alphaClient = _factory.CreateClient();
        var alphaEmail = "c1-alpha@test.com";
        var (alphaUserId, alphaToken) = await TestAuthHelper.RegisterAndLoginAsync(alphaClient, alphaEmail, "Password123");
        TestAuthHelper.AttachToken(alphaClient, alphaToken);
        var alphaMatch = matches.First(m => m.HomeTeam == "Argentina" && m.AwayTeam == "España");
        await alphaClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(alphaMatch.Id, PredictedHomeScore: 1, PredictedAwayScore: 0));

        // userZetaTie: 1 marcador exacto -> 3 puntos totales (mismo total y mismos exactos que alpha/exact,
        // desempatado al final por email alfabético).
        var zetaClient = _factory.CreateClient();
        var zetaEmail = "z1-zeta@test.com";
        var (zetaUserId, zetaToken) = await TestAuthHelper.RegisterAndLoginAsync(zetaClient, zetaEmail, "Password123");
        TestAuthHelper.AttachToken(zetaClient, zetaToken);
        var zetaMatch = matches.First(m => m.HomeTeam == "Brasil" && m.AwayTeam == "Francia");
        await zetaClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(zetaMatch.Id, PredictedHomeScore: 2, PredictedAwayScore: 2));

        // userSignOnly: 3 aciertos de signo (1 pt c/u) -> 3 puntos totales, 0 marcadores exactos.
        // Mismo total que los tres anteriores, pero menos marcadores exactos: debe quedar de último.
        var signClient = _factory.CreateClient();
        var signEmail = "b1-sign@test.com";
        var (signUserId, signToken) = await TestAuthHelper.RegisterAndLoginAsync(signClient, signEmail, "Password123");
        TestAuthHelper.AttachToken(signClient, signToken);
        var signMatch1 = matches.First(m => m.HomeTeam == "Alemania" && m.AwayTeam == "Portugal");
        var signMatch2 = matches.First(m => m.HomeTeam == "España" && m.AwayTeam == "Francia");
        var signMatch3 = matches.First(m => m.HomeTeam == "Inglaterra" && m.AwayTeam == "Países Bajos");
        await signClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(signMatch1.Id, PredictedHomeScore: 1, PredictedAwayScore: 0));
        await signClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(signMatch2.Id, PredictedHomeScore: 1, PredictedAwayScore: 0));
        await signClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(signMatch3.Id, PredictedHomeScore: 1, PredictedAwayScore: 0));

        TestAuthHelper.AttachToken(adminClient, adminToken);
        await adminClient.PutAsJsonAsync($"/api/admin/matches/{exactMatch.Id}/result", new MatchResultRequest(HomeScore: 2, AwayScore: 1));
        await adminClient.PutAsJsonAsync($"/api/admin/matches/{alphaMatch.Id}/result", new MatchResultRequest(HomeScore: 1, AwayScore: 0));
        await adminClient.PutAsJsonAsync($"/api/admin/matches/{zetaMatch.Id}/result", new MatchResultRequest(HomeScore: 2, AwayScore: 2));
        await adminClient.PutAsJsonAsync($"/api/admin/matches/{signMatch1.Id}/result", new MatchResultRequest(HomeScore: 2, AwayScore: 0));
        await adminClient.PutAsJsonAsync($"/api/admin/matches/{signMatch2.Id}/result", new MatchResultRequest(HomeScore: 3, AwayScore: 1));
        await adminClient.PutAsJsonAsync($"/api/admin/matches/{signMatch3.Id}/result", new MatchResultRequest(HomeScore: 2, AwayScore: 1));

        var leaderboard = await adminClient.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard")
            ?? throw new InvalidOperationException("Se esperaba un leaderboard.");

        var relevantUserIds = new HashSet<Guid> { exactUserId, alphaUserId, zetaUserId, signUserId };
        var relevant = leaderboard.Where(e => relevantUserIds.Contains(e.UserId)).ToList();

        Assert.Equal(4, relevant.Count);
        Assert.Equal(new[] { exactUserId, alphaUserId, zetaUserId, signUserId }, relevant.Select(e => e.UserId));
        Assert.All(relevant.Take(3), e =>
        {
            Assert.Equal(3, e.TotalPoints);
            Assert.Equal(1, e.ExactPredictions);
        });
        Assert.Equal(3, relevant[3].TotalPoints);
        Assert.Equal(0, relevant[3].ExactPredictions);
    }

    [Fact]
    public async Task GetUserHistory_AsAdmin_ReturnsTargetUsersHistory()
    {
        var adminClient = _factory.CreateClient();
        var (_, adminToken) = await TestAuthHelper.SeedAdminAndLoginAsync(
            _factory, adminClient, $"admin-{Guid.NewGuid():N}@test.com", "Password123");

        var userClient = _factory.CreateClient();
        var (userId, userToken) = await TestAuthHelper.RegisterAndLoginAsync(
            userClient, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(userClient, userToken);

        var matches = await userClient.GetFromJsonAsync<List<MatchDto>>("/api/matches", TestAuthHelper.JsonOptions);
        var match = matches!.First(m => m.HomeTeam == "Portugal" && m.AwayTeam == "Países Bajos");

        await userClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 2, PredictedAwayScore: 0));

        TestAuthHelper.AttachToken(adminClient, adminToken);
        var response = await adminClient.GetAsync($"/api/predictions/user/{userId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var history = await response.Content.ReadFromJsonAsync<List<PredictionHistoryEntryDto>>();
        var entry = Assert.Single(history!, e => e.MatchId == match.Id);
        Assert.Equal(2, entry.PredictedHomeScore);
        Assert.Equal(0, entry.PredictedAwayScore);
    }

    [Fact]
    public async Task GetUserHistory_AsNonAdminUser_Returns403()
    {
        var userClient = _factory.CreateClient();
        var (userId, userToken) = await TestAuthHelper.RegisterAndLoginAsync(
            userClient, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(userClient, userToken);

        // Ni siquiera consultando su propio userId: esta ruta es exclusiva de Admin,
        // un usuario normal debe usar /api/predictions/me para verse a sí mismo.
        var response = await userClient.GetAsync($"/api/predictions/user/{userId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
