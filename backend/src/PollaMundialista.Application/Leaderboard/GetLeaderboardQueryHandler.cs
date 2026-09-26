using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Leaderboard;

public class GetLeaderboardQueryHandler : IQueryHandler<GetLeaderboardQuery, Result<IReadOnlyList<LeaderboardEntryDto>>>
{
    private readonly IPredictionRepository _predictionRepository;
    private readonly IUserRepository _userRepository;

    public GetLeaderboardQueryHandler(IPredictionRepository predictionRepository, IUserRepository userRepository)
    {
        _predictionRepository = predictionRepository;
        _userRepository = userRepository;
    }

    public async ValueTask<Result<IReadOnlyList<LeaderboardEntryDto>>> Handle(GetLeaderboardQuery request, CancellationToken cancellationToken)
    {
        var predictions = await _predictionRepository.GetAllAsync(cancellationToken);

        var entries = new List<LeaderboardEntryDto>();
        foreach (var group in predictions.GroupBy(p => p.UserId))
        {
            var user = await _userRepository.GetByIdAsync(group.Key, cancellationToken);
            if (user is null)
                continue;

            var totalPoints = group.Sum(p => p.PointsAwarded);
            var exactPredictions = group.Count(p => p.PointsAwarded == 3);

            entries.Add(new LeaderboardEntryDto(group.Key, user.Email, totalPoints, exactPredictions));
        }

        IReadOnlyList<LeaderboardEntryDto> leaderboard = entries
            .OrderByDescending(entry => entry.TotalPoints)
            .ThenByDescending(entry => entry.ExactPredictions)
            .ThenBy(entry => entry.Email, StringComparer.Ordinal)
            .ToList();

        return Result<IReadOnlyList<LeaderboardEntryDto>>.Success(leaderboard);
    }
}
