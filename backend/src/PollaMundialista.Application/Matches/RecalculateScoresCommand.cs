using Mediator;
using PollaMundialista.Application.Common;

namespace PollaMundialista.Application.Matches;

public record RecalculateScoresCommand(Guid MatchId) : ICommand<Result<int>>;
