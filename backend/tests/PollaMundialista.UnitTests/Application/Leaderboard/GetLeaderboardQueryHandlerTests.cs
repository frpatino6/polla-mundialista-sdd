using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Leaderboard;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.UnitTests.Application.Leaderboard;

public class GetLeaderboardQueryHandlerTests
{
    private readonly Mock<IPredictionRepository> _predictionRepository = new();
    private readonly Mock<IUserRepository> _userRepository = new();

    private GetLeaderboardQueryHandler CreateHandler() => new(_predictionRepository.Object, _userRepository.Object);

    private void SetupUser(Guid userId, string email)
    {
        _userRepository
            .Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User(userId, email, "hash", UserRole.User));
    }

    [Fact]
    public async Task Handle_MultipleUsers_GroupsAndOrdersDescendingByPoints()
    {
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var userC = Guid.NewGuid();

        SetupUser(userA, "usera@test.com");
        SetupUser(userB, "userb@test.com");
        SetupUser(userC, "userc@test.com");

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

    [Fact]
    public async Task Handle_TiedTotalPoints_OrdersByExactPredictionsDescending()
    {
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();

        SetupUser(userA, "usera@test.com");
        SetupUser(userB, "userb@test.com");

        // Ambos usuarios suman 3 puntos totales, pero A los obtiene con un solo marcador
        // exacto y B los obtiene con un empate exacto + un acierto de signo (0 marcadores exactos).
        var predictions = new List<Prediction>
        {
            BuildPredictionWithPoints(userA, 3),
            BuildPredictionWithPoints(userB, 1),
            BuildPredictionWithPoints(userB, 1),
            BuildPredictionWithPoints(userB, 1)
        };

        _predictionRepository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(predictions);

        var handler = CreateHandler();

        var result = await handler.Handle(new GetLeaderboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var leaderboard = result.Value!;
        Assert.Equal(2, leaderboard.Count);
        Assert.Equal(3, leaderboard[0].TotalPoints);
        Assert.Equal(3, leaderboard[1].TotalPoints);
        Assert.Equal(userA, leaderboard[0].UserId);
        Assert.Equal(1, leaderboard[0].ExactPredictions);
        Assert.Equal(userB, leaderboard[1].UserId);
        Assert.Equal(0, leaderboard[1].ExactPredictions);
    }

    [Fact]
    public async Task Handle_TiedTotalPointsAndExactPredictions_OrdersByEmailAscending()
    {
        var userZ = Guid.NewGuid();
        var userA = Guid.NewGuid();

        SetupUser(userZ, "zeta@test.com");
        SetupUser(userA, "alpha@test.com");

        var predictions = new List<Prediction>
        {
            BuildPredictionWithPoints(userZ, 3),
            BuildPredictionWithPoints(userA, 3)
        };

        _predictionRepository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(predictions);

        var handler = CreateHandler();

        var result = await handler.Handle(new GetLeaderboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var leaderboard = result.Value!;
        Assert.Equal(2, leaderboard.Count);
        Assert.Equal("alpha@test.com", leaderboard[0].Email);
        Assert.Equal("zeta@test.com", leaderboard[1].Email);
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
