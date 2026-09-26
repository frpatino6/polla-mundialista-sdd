namespace PollaMundialista.Application.Dtos;

public record PredictionDto(
    Guid Id,
    Guid UserId,
    Guid MatchId,
    int PredictedHomeScore,
    int PredictedAwayScore,
    int PointsAwarded);
