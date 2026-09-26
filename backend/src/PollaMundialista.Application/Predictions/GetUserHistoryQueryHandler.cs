using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Predictions;

public class GetUserHistoryQueryHandler : IQueryHandler<GetUserHistoryQuery, Result<IReadOnlyList<PredictionHistoryEntryDto>>>
{
    private readonly IPredictionRepository _predictionRepository;
    private readonly IMatchRepository _matchRepository;

    public GetUserHistoryQueryHandler(IPredictionRepository predictionRepository, IMatchRepository matchRepository)
    {
        _predictionRepository = predictionRepository;
        _matchRepository = matchRepository;
    }

    public async ValueTask<Result<IReadOnlyList<PredictionHistoryEntryDto>>> Handle(GetUserHistoryQuery request, CancellationToken cancellationToken)
    {
        var predictions = await _predictionRepository.GetByUserIdAsync(request.UserId, cancellationToken);

        var history = new List<PredictionHistoryEntryDto>();
        foreach (var prediction in predictions)
        {
            var match = await _matchRepository.GetByIdAsync(prediction.MatchId, cancellationToken);
            if (match is null)
                continue;

            history.Add(new PredictionHistoryEntryDto(
                match.Id,
                match.HomeTeam,
                match.AwayTeam,
                prediction.PredictedResult.HomeScore,
                prediction.PredictedResult.AwayScore,
                match.Result?.HomeScore,
                match.Result?.AwayScore,
                prediction.PointsAwarded));
        }

        return Result<IReadOnlyList<PredictionHistoryEntryDto>>.Success(history);
    }
}
