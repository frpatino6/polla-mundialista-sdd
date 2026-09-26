using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Infrastructure.Persistence.Seed;

public sealed record MatchSeedEntry(MatchGroup Group, string HomeTeam, string AwayTeam, DateTimeOffset KickoffAt);
