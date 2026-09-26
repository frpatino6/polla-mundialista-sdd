using PollaMundialista.Domain.Exceptions;

namespace PollaMundialista.Domain.ValueObjects;

public sealed record MatchResult
{
    public int HomeScore { get; }
    public int AwayScore { get; }

    public MatchResult(int homeScore, int awayScore)
    {
        if (homeScore < 0)
            throw new DomainException(DomainErrorMessages.HomeScoreCannotBeNegative);

        if (awayScore < 0)
            throw new DomainException(DomainErrorMessages.AwayScoreCannotBeNegative);

        HomeScore = homeScore;
        AwayScore = awayScore;
    }
}
