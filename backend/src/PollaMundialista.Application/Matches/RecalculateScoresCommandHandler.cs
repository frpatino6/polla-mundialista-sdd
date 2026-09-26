using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Enums;

namespace PollaMundialista.Application.Matches;

public class RecalculateScoresCommandHandler : ICommandHandler<RecalculateScoresCommand, Result<int>>
{
    private readonly IMatchRepository _matchRepository;
    private readonly IPredictionRepository _predictionRepository;

    public RecalculateScoresCommandHandler(IMatchRepository matchRepository, IPredictionRepository predictionRepository)
    {
        _matchRepository = matchRepository;
        _predictionRepository = predictionRepository;
    }

    public async ValueTask<Result<int>> Handle(RecalculateScoresCommand request, CancellationToken cancellationToken)
    {
        var match = await _matchRepository.GetByIdAsync(request.MatchId, cancellationToken);
        if (match is null)
            return Result<int>.Failure(ResultError.NotFound, "El partido no existe.");

        if (match.Result is null)
            return Result<int>.Failure(ResultError.Validation, "No se puede recalcular puntos sin un resultado cargado.");

        var predictions = await _predictionRepository.GetByMatchIdAsync(request.MatchId, cancellationToken);
        foreach (var prediction in predictions)
        {
            prediction.RecalculatePoints(match.Result);
            await _predictionRepository.UpdateAsync(prediction, cancellationToken);
        }

        return Result<int>.Success(predictions.Count);
    }
}
