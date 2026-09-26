using PollaMundialista.Domain.Enums;
using PollaMundialista.Infrastructure.Persistence.Seed;

namespace PollaMundialista.UnitTests.Persistence.Seed;

public class MatchSeedLoaderTests
{
    [Fact]
    public void LoadFromRepoFixture_ReturnsExactly12Entries()
    {
        var entries = MatchSeedLoader.LoadFromRepoFixture();

        Assert.Equal(12, entries.Count);
    }

    [Fact]
    public void LoadFromRepoFixture_HasExactly6PerGroup()
    {
        var entries = MatchSeedLoader.LoadFromRepoFixture();

        Assert.Equal(6, entries.Count(e => e.Group == MatchGroup.A));
        Assert.Equal(6, entries.Count(e => e.Group == MatchGroup.B));
    }

    [Fact]
    public void LoadFromRepoFixture_HasNoDuplicateMatchups()
    {
        var entries = MatchSeedLoader.LoadFromRepoFixture();

        var distinctMatchups = entries
            .Select(e => (e.Group, e.HomeTeam, e.AwayTeam))
            .Distinct()
            .Count();

        Assert.Equal(entries.Count, distinctMatchups);
    }

    [Fact]
    public void MatchSeedEntry_HasNoResultProperties()
    {
        var resultPropertyNames = new[] { "HomeScore", "AwayScore", "RealHomeScore", "RealAwayScore" };

        var properties = typeof(MatchSeedEntry).GetProperties().Select(p => p.Name);

        Assert.Empty(properties.Intersect(resultPropertyNames));
    }
}
