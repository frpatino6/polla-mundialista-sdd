using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Predictions;

public record GetUserHistoryQuery(Guid UserId) : IQuery<Result<IReadOnlyList<PredictionHistoryEntryDto>>>;
