using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Matches;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.ValueObjects;
using Match = PollaMundialista.Domain.Entities.Match;

namespace PollaMundialista.UnitTests.Application.Matches;

public class GetMatchesQueryHandlerTests
{
    private readonly Mock<IMatchRepository> _matchRepository = new();

    private GetMatchesQueryHandler CreateHandler() => new(_matchRepository.Object);

    [Fact]
    public async Task Handle_ReturnsAllMatchesMappedToDto()
    {
        var pendingMatchId = Guid.NewGuid();
        var playedMatchId = Guid.NewGuid();
        var kickoffAt1 = DateTimeOffset.UtcNow.AddDays(1);
        var kickoffAt2 = DateTimeOffset.UtcNow.AddDays(2);

        var pendingMatch = new Match(pendingMatchId, MatchGroup.A, "Colombia", "Brasil", kickoffAt1);
        var playedMatch = new Match(playedMatchId, MatchGroup.B, "Alemania", "Portugal", kickoffAt2);
        playedMatch.SetResult(new MatchResult(2, 1));

        _matchRepository
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Match> { pendingMatch, playedMatch });

        var handler = CreateHandler();

        var result = await handler.Handle(new GetMatchesQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);

        var pendingDto = result.Value.Single(m => m.Id == pendingMatchId);
        Assert.Equal(MatchGroup.A, pendingDto.Group);
        Assert.Equal("Colombia", pendingDto.HomeTeam);
        Assert.Equal("Brasil", pendingDto.AwayTeam);
        Assert.Equal(kickoffAt1, pendingDto.KickoffAt);
        Assert.Null(pendingDto.HomeScore);
        Assert.Null(pendingDto.AwayScore);

        var playedDto = result.Value.Single(m => m.Id == playedMatchId);
        Assert.Equal(2, playedDto.HomeScore);
        Assert.Equal(1, playedDto.AwayScore);
    }

    [Fact]
    public async Task Handle_NoMatches_ReturnsEmptyList()
    {
        _matchRepository
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Match>());

        var handler = CreateHandler();

        var result = await handler.Handle(new GetMatchesQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!);
    }
}
