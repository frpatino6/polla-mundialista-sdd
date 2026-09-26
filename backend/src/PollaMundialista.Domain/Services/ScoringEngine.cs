using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.Domain.Services;

public static class ScoringEngine
{
    public static int CalculatePoints(MatchResult prediction, MatchResult actual)
    {
        if (prediction.HomeScore == actual.HomeScore && prediction.AwayScore == actual.AwayScore)
            return 3;

        if (GetOutcome(prediction) == GetOutcome(actual))
            return 1;

        return 0;
    }

    private static MatchOutcome GetOutcome(MatchResult r) =>
        r.HomeScore == r.AwayScore ? MatchOutcome.Draw
        : r.HomeScore > r.AwayScore ? MatchOutcome.HomeWin
        : MatchOutcome.AwayWin;
}
