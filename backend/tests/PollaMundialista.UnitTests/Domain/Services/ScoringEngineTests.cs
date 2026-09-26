using PollaMundialista.Domain.Exceptions;
using PollaMundialista.Domain.Services;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.UnitTests.Domain.Services;

public class ScoringEngineTests
{
    [Theory]
    [InlineData(2, 1, 2, 1)] // Marcador exacto, victoria local.
    [InlineData(1, 1, 1, 1)] // Marcador exacto, empate.
    [InlineData(4, 3, 4, 3)] // Marcador exacto, marcadores altos.
    public void CalculatePoints_ExactScore_Returns3(int predHome, int predAway, int actualHome, int actualAway)
    {
        var prediction = new MatchResult(predHome, predAway);
        var actual = new MatchResult(actualHome, actualAway);

        var points = ScoringEngine.CalculatePoints(prediction, actual);

        Assert.Equal(3, points);
    }

    [Fact]
    public void CalculatePoints_OutcomeMatchesHomeWin_WithoutExactScore_Returns1()
    {
        var prediction = new MatchResult(2, 0);
        var actual = new MatchResult(3, 1);

        var points = ScoringEngine.CalculatePoints(prediction, actual);

        Assert.Equal(1, points);
    }

    [Fact]
    public void CalculatePoints_OutcomeMatchesAwayWin_WithoutExactScore_Returns1()
    {
        var prediction = new MatchResult(0, 2);
        var actual = new MatchResult(1, 3);

        var points = ScoringEngine.CalculatePoints(prediction, actual);

        Assert.Equal(1, points);
    }

    [Fact]
    public void CalculatePoints_OutcomeMatchesDraw_WithoutExactScore_Returns1()
    {
        var prediction = new MatchResult(0, 0);
        var actual = new MatchResult(2, 2);

        var points = ScoringEngine.CalculatePoints(prediction, actual);

        Assert.Equal(1, points);
    }

    [Fact]
    public void CalculatePoints_OutcomeMismatch_Returns0()
    {
        var prediction = new MatchResult(2, 0);
        var actual = new MatchResult(0, 2);

        var points = ScoringEngine.CalculatePoints(prediction, actual);

        Assert.Equal(0, points);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, -1)]
    [InlineData(-1, -1)]
    public void MatchResult_NegativeScore_ThrowsDomainException(int homeScore, int awayScore)
    {
        Assert.Throws<DomainException>(() => new MatchResult(homeScore, awayScore));
    }
}
