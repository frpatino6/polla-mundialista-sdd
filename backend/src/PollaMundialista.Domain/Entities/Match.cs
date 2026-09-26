using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.Exceptions;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.Domain.Entities;

public class Match
{
    public Guid Id { get; private set; }
    public MatchGroup Group { get; private set; }
    public string HomeTeam { get; private set; }
    public string AwayTeam { get; private set; }
    public DateTimeOffset KickoffAt { get; private set; }
    public MatchResult? Result { get; private set; }

    public Match(Guid id, MatchGroup group, string homeTeam, string awayTeam, DateTimeOffset kickoffAt)
    {
        if (!Enum.IsDefined(typeof(MatchGroup), group))
            throw new DomainException(DomainErrorMessages.InvalidMatchGroup);

        if (string.IsNullOrWhiteSpace(homeTeam))
            throw new DomainException(DomainErrorMessages.HomeTeamRequired);

        if (string.IsNullOrWhiteSpace(awayTeam))
            throw new DomainException(DomainErrorMessages.AwayTeamRequired);

        if (string.Equals(homeTeam, awayTeam, StringComparison.Ordinal))
            throw new DomainException(DomainErrorMessages.TeamsMustDiffer);

        Id = id;
        Group = group;
        HomeTeam = homeTeam;
        AwayTeam = awayTeam;
        KickoffAt = kickoffAt;
    }

    public bool HasStarted(DateTimeOffset now) => now >= KickoffAt;

    public void SetResult(MatchResult result)
    {
        Result = result;
    }
}
