using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Application.Enums;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.ValueObjects;

namespace PollaMundialista.Application.Predictions;

public class RegisterPredictionCommandHandler : ICommandHandler<RegisterPredictionCommand, Result<PredictionDto>>
{
    private readonly IMatchRepository _matchRepository;
    private readonly IPredictionRepository _predictionRepository;
    private readonly IDateTimeProvider _dateTimeProvider;

    public RegisterPredictionCommandHandler(
        IMatchRepository matchRepository,
        IPredictionRepository predictionRepository,
        IDateTimeProvider dateTimeProvider)
    {
        _matchRepository = matchRepository;
        _predictionRepository = predictionRepository;
        _dateTimeProvider = dateTimeProvider;
    }

    public async ValueTask<Result<PredictionDto>> Handle(RegisterPredictionCommand request, CancellationToken cancellationToken)
    {
        var match = await _matchRepository.GetByIdAsync(request.MatchId, cancellationToken);
        if (match is null)
            return Result<PredictionDto>.Failure(ResultError.NotFound, "El partido no existe.");

        if (match.HasStarted(_dateTimeProvider.UtcNow))
            return Result<PredictionDto>.Failure(ResultError.Conflict, "No se puede registrar una predicción después del kickoff del partido.");

        var predictedResult = new MatchResult(request.PredictedHomeScore, request.PredictedAwayScore);
        var existingPrediction = await _predictionRepository.GetByUserAndMatchAsync(request.UserId, request.MatchId, cancellationToken);

        Prediction prediction;
        if (existingPrediction is null)
        {
            prediction = new Prediction(Guid.NewGuid(), request.UserId, request.MatchId, predictedResult, hasMatchStarted: false);
            await _predictionRepository.AddAsync(prediction, cancellationToken);
        }
        else
        {
            existingPrediction.ChangePrediction(predictedResult, hasMatchStarted: false);
            prediction = existingPrediction;
            await _predictionRepository.UpdateAsync(prediction, cancellationToken);
        }

        var dto = new PredictionDto(
            prediction.Id,
            prediction.UserId,
            prediction.MatchId,
            prediction.PredictedResult.HomeScore,
            prediction.PredictedResult.AwayScore,
            prediction.PointsAwarded);

        return Result<PredictionDto>.Success(dto);
    }
}
