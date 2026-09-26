using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Matches;

public record GetMatchesQuery : IQuery<Result<IReadOnlyList<MatchDto>>>;
