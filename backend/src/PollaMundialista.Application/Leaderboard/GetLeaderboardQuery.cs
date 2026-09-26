using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Leaderboard;

public record GetLeaderboardQuery : IQuery<Result<IReadOnlyList<LeaderboardEntryDto>>>;
