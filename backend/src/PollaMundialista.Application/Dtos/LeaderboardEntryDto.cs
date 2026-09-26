namespace PollaMundialista.Application.Dtos;

public record LeaderboardEntryDto(Guid UserId, string Email, int TotalPoints, int ExactPredictions);
