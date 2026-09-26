using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Application.Dtos;

public record MatchDto(
    Guid Id,
    MatchGroup Group,
    string HomeTeam,
    string AwayTeam,
    DateTimeOffset KickoffAt,
    int? HomeScore,
    int? AwayScore);
