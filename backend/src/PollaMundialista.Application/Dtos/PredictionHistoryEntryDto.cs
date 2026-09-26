namespace PollaMundialista.Application.Dtos;

public record PredictionHistoryEntryDto(
    Guid MatchId,
    string HomeTeam,
    string AwayTeam,
    int PredictedHomeScore,
    int PredictedAwayScore,
    int? ActualHomeScore,
    int? ActualAwayScore,
    int PointsAwarded);
