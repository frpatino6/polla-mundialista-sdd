using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using PollaMundialista.Api.Controllers;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.IntegrationTests;

public class EndToEndFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    // Ver HarnessFlowTests: MatchDto.Group es MatchGroup (enum) serializado como string por el
    // servidor; GetFromJsonAsync usa "web defaults" por separado, así que hay que replicar el
    // mismo JsonStringEnumConverter en el cliente de test.
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly CustomWebApplicationFactory _factory;

    public EndToEndFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CompleteUserJourney_AllEightEndpoints_WorksEndToEnd()
    {
        // 1. Registro de un usuario nuevo.
        var userClient = _factory.CreateClient();
        var userEmail = $"e2e-user-{Guid.NewGuid():N}@test.com";
        const string password = "Password123";

        var registerResponse = await userClient.PostAsJsonAsync("/api/auth/register", new RegisterRequest(userEmail, password));
        Assert.True(registerResponse.IsSuccessStatusCode);

        // 2. Login del usuario recién registrado.
        var loginResponse = await userClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(userEmail, password));
        Assert.True(loginResponse.IsSuccessStatusCode);

        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResultDto>();
        Assert.NotNull(loginResult);
        var userId = loginResult!.UserId;
        var userToken = loginResult.Token;
        TestAuthHelper.AttachToken(userClient, userToken);

        // 3. Siembra y login de un Admin.
        var adminClient = _factory.CreateClient();
        var (_, adminToken) = await TestAuthHelper.SeedAdminAndLoginAsync(
            _factory, adminClient, $"e2e-admin-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(adminClient, adminToken);

        // 4. GET /api/matches (usuario) -> deben venir los 12 partidos sembrados.
        var matches = await userClient.GetFromJsonAsync<List<MatchDto>>("/api/matches", JsonOptions);
        Assert.NotNull(matches);
        Assert.Equal(12, matches!.Count);

        var match = matches.First(m => m.HomeTeam == "Argentina" && m.AwayTeam == "Brasil");

        // 5. POST /api/predictions (usuario) -> predice el marcador de Argentina vs Brasil.
        var predictionResponse = await userClient.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 2, PredictedAwayScore: 1));
        Assert.True(predictionResponse.IsSuccessStatusCode);

        // 6. GET /api/predictions/me (usuario) -> la predicción recién creada aparece en su historial.
        var ownHistory = await userClient.GetFromJsonAsync<List<PredictionHistoryEntryDto>>("/api/predictions/me");
        Assert.NotNull(ownHistory);
        var ownEntry = Assert.Single(ownHistory!, e => e.MatchId == match.Id);
        Assert.Equal(2, ownEntry.PredictedHomeScore);
        Assert.Equal(1, ownEntry.PredictedAwayScore);

        // 7. PUT /api/admin/matches/{matchId}/result (admin) -> resultado real idéntico al predicho (3 pts).
        var resultResponse = await adminClient.PutAsJsonAsync($"/api/admin/matches/{match.Id}/result",
            new MatchResultRequest(HomeScore: 2, AwayScore: 1));
        Assert.True(resultResponse.IsSuccessStatusCode);

        // 8. GET /api/predictions/user/{userId} (admin) -> ve la misma predicción, ahora con 3 pts.
        var adminViewOfHistory = await adminClient.GetFromJsonAsync<List<PredictionHistoryEntryDto>>($"/api/predictions/user/{userId}");
        Assert.NotNull(adminViewOfHistory);
        var adminEntry = Assert.Single(adminViewOfHistory!, e => e.MatchId == match.Id);
        Assert.Equal(2, adminEntry.PredictedHomeScore);
        Assert.Equal(1, adminEntry.PredictedAwayScore);
        Assert.Equal(3, adminEntry.PointsAwarded);

        // 9. GET /api/leaderboard (usuario) -> aparece con 3 puntos totales y 1 predicción exacta.
        var leaderboard = await userClient.GetFromJsonAsync<List<LeaderboardEntryDto>>("/api/leaderboard");
        Assert.NotNull(leaderboard);
        var leaderboardEntry = leaderboard!.Single(e => e.UserId == userId);
        Assert.Equal(3, leaderboardEntry.TotalPoints);
        Assert.Equal(1, leaderboardEntry.ExactPredictions);
    }
}
