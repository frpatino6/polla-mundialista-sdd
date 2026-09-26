using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.Exceptions;

namespace PollaMundialista.UnitTests.Domain.Entities;

public class MatchTests
{
    private static readonly DateTimeOffset Kickoff = new(2026, 6, 15, 18, 0, 0, TimeSpan.Zero);

    private static Match CreateValidMatch() =>
        new(Guid.NewGuid(), MatchGroup.A, "Colombia", "Brasil", Kickoff);

    [Fact]
    public void Constructor_ValidData_CreatesMatch()
    {
        var id = Guid.NewGuid();

        var match = new Match(id, MatchGroup.B, "Argentina", "Uruguay", Kickoff);

        Assert.Equal(id, match.Id);
        Assert.Equal(MatchGroup.B, match.Group);
        Assert.Equal("Argentina", match.HomeTeam);
        Assert.Equal("Uruguay", match.AwayTeam);
        Assert.Equal(Kickoff, match.KickoffAt);
        Assert.Null(match.Result);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(99)]
    public void Constructor_InvalidGroup_ThrowsDomainException(int invalidGroup)
    {
        Assert.Throws<DomainException>(() => new Match(Guid.NewGuid(), (MatchGroup)invalidGroup, "Colombia", "Brasil", Kickoff));
    }

    [Fact]
    public void Constructor_EmptyHomeTeam_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => new Match(Guid.NewGuid(), MatchGroup.A, "  ", "Brasil", Kickoff));
    }

    [Fact]
    public void Constructor_EmptyAwayTeam_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => new Match(Guid.NewGuid(), MatchGroup.A, "Colombia", "", Kickoff));
    }

    [Fact]
    public void Constructor_SameHomeAndAwayTeam_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => new Match(Guid.NewGuid(), MatchGroup.A, "Colombia", "Colombia", Kickoff));
    }

    [Fact]
    public void HasStarted_BeforeKickoff_ReturnsFalse()
    {
        var match = CreateValidMatch();

        var result = match.HasStarted(Kickoff.AddMinutes(-1));

        Assert.False(result);
    }

    [Fact]
    public void HasStarted_AtOrAfterKickoff_ReturnsTrue()
    {
        var match = CreateValidMatch();

        Assert.True(match.HasStarted(Kickoff));
        Assert.True(match.HasStarted(Kickoff.AddMinutes(1)));
    }
}
