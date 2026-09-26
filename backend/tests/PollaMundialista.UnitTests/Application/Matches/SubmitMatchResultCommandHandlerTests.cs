using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Enums;
using PollaMundialista.Application.Matches;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using Match = PollaMundialista.Domain.Entities.Match;

namespace PollaMundialista.UnitTests.Application.Matches;

public class SubmitMatchResultCommandHandlerTests
{
    private readonly Mock<IMatchRepository> _matchRepository = new();

    private SubmitMatchResultCommandHandler CreateHandler() => new(_matchRepository.Object);

    [Fact]
    public async Task Handle_MatchExists_SetsResultAndReturnsSuccess()
    {
        var matchId = Guid.NewGuid();
        var match = new Match(matchId, MatchGroup.A, "Colombia", "Brasil", DateTimeOffset.UtcNow.AddDays(-1));
        _matchRepository.Setup(r => r.GetByIdAsync(matchId, It.IsAny<CancellationToken>())).ReturnsAsync(match);

        var handler = CreateHandler();
        var command = new SubmitMatchResultCommand(matchId, 2, 1);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.HomeScore);
        Assert.Equal(1, result.Value.AwayScore);
        Assert.Equal(2, match.Result!.HomeScore);
        Assert.Equal(1, match.Result.AwayScore);
        _matchRepository.Verify(r => r.UpdateAsync(match, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_MatchDoesNotExist_ReturnsNotFound()
    {
        var command = new SubmitMatchResultCommand(Guid.NewGuid(), 1, 0);
        _matchRepository.Setup(r => r.GetByIdAsync(command.MatchId, It.IsAny<CancellationToken>())).ReturnsAsync((Match?)null);

        var handler = CreateHandler();

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.NotFound, result.Error);
        _matchRepository.Verify(r => r.UpdateAsync(It.IsAny<Match>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
