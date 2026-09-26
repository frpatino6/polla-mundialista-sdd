using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Enums;
using PollaMundialista.Application.Matches;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.ValueObjects;
using Match = PollaMundialista.Domain.Entities.Match;

namespace PollaMundialista.UnitTests.Application.Matches;

public class RecalculateScoresCommandHandlerTests
{
    private readonly Mock<IMatchRepository> _matchRepository = new();
    private readonly Mock<IPredictionRepository> _predictionRepository = new();

    private RecalculateScoresCommandHandler CreateHandler() => new(_matchRepository.Object, _predictionRepository.Object);

    [Fact]
    public async Task Handle_MatchHasResult_RecalculatesAllPredictionsAndReturnsCount()
    {
        var matchId = Guid.NewGuid();
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", DateTimeOffset.UtcNow.AddDays(-1));
        match.SetResult(new MatchResult(2, 1));

        var predictions = new List<Prediction>
        {
            new(Guid.NewGuid(), Guid.NewGuid(), matchId, new MatchResult(2, 1), hasMatchStarted: false),
            new(Guid.NewGuid(), Guid.NewGuid(), matchId, new MatchResult(0, 0), hasMatchStarted: false)
        };

        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);
        _predictionRepository
            .Setup(r => r.GetByMatchIdAsync(matchId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(predictions);

        var handler = CreateHandler();
        var command = new RecalculateScoresCommand(matchId);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value);
        Assert.Equal(3, predictions[0].PointsAwarded);
        Assert.Equal(0, predictions[1].PointsAwarded);
        _predictionRepository.Verify(r => r.UpdateAsync(predictions[0], It.IsAny<CancellationToken>()), Times.Once);
        _predictionRepository.Verify(r => r.UpdateAsync(predictions[1], It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_MatchDoesNotExist_ReturnsNotFound()
    {
        var command = new RecalculateScoresCommand(Guid.NewGuid());
        _matchRepository.Setup(r => r.GetByIdAsync(command.MatchId, It.IsAny<CancellationToken>())).ReturnsAsync((Match?)null);

        var handler = CreateHandler();

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.NotFound, result.Error);
    }

    [Fact]
    public async Task Handle_MatchHasNoResult_ReturnsValidation()
    {
        var matchId = Guid.NewGuid();
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", DateTimeOffset.UtcNow.AddDays(-1));
        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);

        var handler = CreateHandler();
        var command = new RecalculateScoresCommand(matchId);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Validation, result.Error);
        _predictionRepository.Verify(r => r.GetByMatchIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
