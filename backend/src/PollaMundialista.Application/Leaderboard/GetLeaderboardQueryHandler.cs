using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Leaderboard;

public class GetLeaderboardQueryHandler : IQueryHandler<GetLeaderboardQuery, Result<IReadOnlyList<LeaderboardEntryDto>>>
{
    private readonly IPredictionRepository _predictionRepository;

    public GetLeaderboardQueryHandler(IPredictionRepository predictionRepository)
    {
        _predictionRepository = predictionRepository;
    }

    public async ValueTask<Result<IReadOnlyList<LeaderboardEntryDto>>> Handle(GetLeaderboardQuery request, CancellationToken cancellationToken)
    {
        var predictions = await _predictionRepository.GetAllAsync(cancellationToken);

        IReadOnlyList<LeaderboardEntryDto> leaderboard = predictions
            .GroupBy(p => p.UserId)
            .Select(g => new LeaderboardEntryDto(g.Key, g.Sum(p => p.PointsAwarded)))
            .OrderByDescending(entry => entry.TotalPoints)
            .ToList();

        return Result<IReadOnlyList<LeaderboardEntryDto>>.Success(leaderboard);
    }
}
