using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Infrastructure.Persistence;

namespace PollaMundialista.IntegrationTests;

public class PredictionsFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public PredictionsFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostTwiceForSameMatch_UpsertsInsteadOfDuplicating()
    {
        var client = _factory.CreateClient();
        var (_, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(client, token);

        var matches = await client.GetFromJsonAsync<List<MatchDto>>("/api/matches", TestAuthHelper.JsonOptions);
        var match = matches!.First();

        var firstResponse = await client.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 1, PredictedAwayScore: 1));
        Assert.True(firstResponse.IsSuccessStatusCode);

        var secondResponse = await client.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(match.Id, PredictedHomeScore: 3, PredictedAwayScore: 0));
        Assert.True(secondResponse.IsSuccessStatusCode);

        var history = await client.GetFromJsonAsync<List<PredictionHistoryEntryDto>>("/api/predictions/me");

        var entriesForMatch = history!.Where(e => e.MatchId == match.Id).ToList();
        var entry = Assert.Single(entriesForMatch);
        Assert.Equal(3, entry.PredictedHomeScore);
        Assert.Equal(0, entry.PredictedAwayScore);
    }

    [Fact]
    public async Task PostAfterKickoff_Returns409Conflict()
    {
        var client = _factory.CreateClient();
        var (_, token) = await TestAuthHelper.RegisterAndLoginAsync(client, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(client, token);

        Guid pastMatchId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pastMatch = new Match(Guid.NewGuid(), MatchGroup.A, "TeamPast1", "TeamPast2", DateTimeOffset.UtcNow.AddDays(-1));
            dbContext.Matches.Add(pastMatch);
            await dbContext.SaveChangesAsync();
            pastMatchId = pastMatch.Id;
        }

        var response = await client.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(pastMatchId, PredictedHomeScore: 1, PredictedAwayScore: 0));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task GetMyHistory_ReturnsOnlyOwnPredictions()
    {
        var clientA = _factory.CreateClient();
        var (_, tokenA) = await TestAuthHelper.RegisterAndLoginAsync(clientA, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(clientA, tokenA);

        var clientB = _factory.CreateClient();
        var (_, tokenB) = await TestAuthHelper.RegisterAndLoginAsync(clientB, $"user-{Guid.NewGuid():N}@test.com", "Password123");
        TestAuthHelper.AttachToken(clientB, tokenB);

        var matches = await clientA.GetFromJsonAsync<List<MatchDto>>("/api/matches", TestAuthHelper.JsonOptions);
        var matchForA = matches!.First(m => m.HomeTeam == "Argentina" && m.AwayTeam == "Brasil");
        var matchForB = matches!.First(m => m.HomeTeam == "Alemania" && m.AwayTeam == "Portugal");

        var responseA = await clientA.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(matchForA.Id, PredictedHomeScore: 2, PredictedAwayScore: 0));
        Assert.True(responseA.IsSuccessStatusCode);

        var responseB = await clientB.PostAsJsonAsync("/api/predictions",
            new PredictionRequest(matchForB.Id, PredictedHomeScore: 1, PredictedAwayScore: 1));
        Assert.True(responseB.IsSuccessStatusCode);

        var historyA = await clientA.GetFromJsonAsync<List<PredictionHistoryEntryDto>>("/api/predictions/me");

        Assert.Contains(historyA!, e => e.MatchId == matchForA.Id);
        Assert.DoesNotContain(historyA!, e => e.MatchId == matchForB.Id);
    }
}
