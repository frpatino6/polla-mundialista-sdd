using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Enums;
using PollaMundialista.Application.Predictions;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.ValueObjects;
using Match = PollaMundialista.Domain.Entities.Match;

namespace PollaMundialista.UnitTests.Application.Predictions;

public class RegisterPredictionCommandHandlerTests
{
    private readonly Mock<IMatchRepository> _matchRepository = new();
    private readonly Mock<IPredictionRepository> _predictionRepository = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();

    private RegisterPredictionCommandHandler CreateHandler() =>
        new(_matchRepository.Object, _predictionRepository.Object, _dateTimeProvider.Object);

    [Fact]
    public async Task Handle_NewPrediction_CreatesPredictionAndReturnsSuccess()
    {
        var userId = Guid.NewGuid();
        var matchId = Guid.NewGuid();
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", DateTimeOffset.UtcNow.AddDays(1));
        var now = DateTimeOffset.UtcNow;

        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);
        _dateTimeProvider.Setup(p => p.UtcNow).Returns(now);
        _predictionRepository
            .Setup(r => r.GetByUserAndMatchAsync(userId, matchId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Prediction?)null);

        var handler = CreateHandler();
        var command = new RegisterPredictionCommand(userId, matchId, 2, 1);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, result.Value!.UserId);
        Assert.Equal(matchId, result.Value.MatchId);
        Assert.Equal(2, result.Value.PredictedHomeScore);
        Assert.Equal(1, result.Value.PredictedAwayScore);
        _predictionRepository.Verify(r => r.AddAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Once);
        _predictionRepository.Verify(r => r.UpdateAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ExistingPrediction_UpdatesPredictionAndReturnsSuccess()
    {
        var userId = Guid.NewGuid();
        var matchId = Guid.NewGuid();
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", DateTimeOffset.UtcNow.AddDays(1));
        var existingPrediction = new Prediction(Guid.NewGuid(), userId, matchId, new MatchResult(0, 0), hasMatchStarted: false);

        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);
        _dateTimeProvider.Setup(p => p.UtcNow).Returns(DateTimeOffset.UtcNow);
        _predictionRepository
            .Setup(r => r.GetByUserAndMatchAsync(userId, matchId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPrediction);

        var handler = CreateHandler();
        var command = new RegisterPredictionCommand(userId, matchId, 3, 2);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.PredictedHomeScore);
        Assert.Equal(2, result.Value.PredictedAwayScore);
        _predictionRepository.Verify(r => r.UpdateAsync(existingPrediction, It.IsAny<CancellationToken>()), Times.Once);
        _predictionRepository.Verify(r => r.AddAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_MatchDoesNotExist_ReturnsNotFound()
    {
        var command = new RegisterPredictionCommand(Guid.NewGuid(), Guid.NewGuid(), 1, 1);
        _matchRepository.Setup(r => r.GetByIdAsync(command.MatchId, It.IsAny<CancellationToken>())).ReturnsAsync((Match?)null);

        var handler = CreateHandler();

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.NotFound, result.Error);
    }

    [Fact]
    public async Task Handle_MatchAlreadyStarted_ReturnsConflict_AndNeverTouchesPredictionRepository()
    {
        var matchId = Guid.NewGuid();
        var kickoffAt = DateTimeOffset.UtcNow.AddHours(-1);
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", kickoffAt);
        var command = new RegisterPredictionCommand(Guid.NewGuid(), matchId, 1, 1);

        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);
        _dateTimeProvider.Setup(p => p.UtcNow).Returns(DateTimeOffset.UtcNow);

        var handler = CreateHandler();

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Conflict, result.Error);
        _predictionRepository.Verify(r => r.GetByUserAndMatchAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _predictionRepository.Verify(r => r.AddAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Never);
        _predictionRepository.Verify(r => r.UpdateAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
