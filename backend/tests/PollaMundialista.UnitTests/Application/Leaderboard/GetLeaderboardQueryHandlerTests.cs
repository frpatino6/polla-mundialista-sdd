using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Leaderboard;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.UnitTests.Application.Leaderboard;

public class GetLeaderboardQueryHandlerTests
{
    private readonly Mock<IPredictionRepository> _predictionRepository = new();

    private GetLeaderboardQueryHandler CreateHandler() => new(_predictionRepository.Object);

    [Fact]
    public async Task Handle_MultipleUsers_GroupsAndOrdersDescendingByPoints()
    {
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var userC = Guid.NewGuid();

        var predictions = new List<Prediction>
        {
            BuildPredictionWithPoints(userA, 3),
            BuildPredictionWithPoints(userA, 1),
            BuildPredictionWithPoints(userB, 3),
            BuildPredictionWithPoints(userB, 3),
            BuildPredictionWithPoints(userC, 0)
        };

        _predictionRepository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(predictions);

        var handler = CreateHandler();

        var result = await handler.Handle(new GetLeaderboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var leaderboard = result.Value!;
        Assert.Equal(3, leaderboard.Count);
        Assert.Equal(userB, leaderboard[0].UserId);
        Assert.Equal(6, leaderboard[0].TotalPoints);
        Assert.Equal(userA, leaderboard[1].UserId);
        Assert.Equal(4, leaderboard[1].TotalPoints);
        Assert.Equal(userC, leaderboard[2].UserId);
        Assert.Equal(0, leaderboard[2].TotalPoints);
    }

    private static Prediction BuildPredictionWithPoints(Guid userId, int points)
    {
        var predictedResult = new MatchResult(1, 0);
        var actualResult = points switch
        {
            3 => new MatchResult(1, 0),
            1 => new MatchResult(2, 0),
            _ => new MatchResult(0, 1)
        };

        var prediction = new Prediction(Guid.NewGuid(), userId, Guid.NewGuid(), predictedResult, hasMatchStarted: false);
        prediction.RecalculatePoints(actualResult);
        return prediction;
    }
}
