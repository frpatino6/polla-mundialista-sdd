using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Predictions;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.ValueObjects;
using Match = PollaMundialista.Domain.Entities.Match;

namespace PollaMundialista.UnitTests.Application.Predictions;

public class GetUserHistoryQueryHandlerTests
{
    private readonly Mock<IPredictionRepository> _predictionRepository = new();
    private readonly Mock<IMatchRepository> _matchRepository = new();

    private GetUserHistoryQueryHandler CreateHandler() => new(_predictionRepository.Object, _matchRepository.Object);

    [Fact]
    public async Task Handle_CombinesPredictionAndMatchData()
    {
        var userId = Guid.NewGuid();
        var matchId = Guid.NewGuid();
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", DateTimeOffset.UtcNow.AddDays(-1));
        match.SetResult(new MatchResult(2, 1));

        var prediction = new Prediction(Guid.NewGuid(), userId, matchId, new MatchResult(2, 1), hasMatchStarted: false);
        prediction.RecalculatePoints(match.Result!);

        _predictionRepository
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Prediction> { prediction });
        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);

        var handler = CreateHandler();

        var result = await handler.Handle(new GetUserHistoryQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var entry = Assert.Single(result.Value!);
        Assert.Equal(matchId, entry.MatchId);
        Assert.Equal("Colombia", entry.HomeTeam);
        Assert.Equal("Brasil", entry.AwayTeam);
        Assert.Equal(2, entry.PredictedHomeScore);
        Assert.Equal(1, entry.PredictedAwayScore);
        Assert.Equal(2, entry.ActualHomeScore);
        Assert.Equal(1, entry.ActualAwayScore);
        Assert.Equal(3, entry.PointsAwarded);
    }
}
