using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Predictions;

public record RegisterPredictionCommand(
    Guid UserId,
    Guid MatchId,
    int PredictedHomeScore,
    int PredictedAwayScore) : ICommand<Result<PredictionDto>>;
