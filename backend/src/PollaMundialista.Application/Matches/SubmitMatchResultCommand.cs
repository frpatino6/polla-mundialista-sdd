using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Matches;

public record SubmitMatchResultCommand(Guid MatchId, int HomeScore, int AwayScore) : ICommand<Result<MatchDto>>;
