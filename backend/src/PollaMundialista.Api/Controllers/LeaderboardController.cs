using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PollaMundialista.Api.Common;
using PollaMundialista.Application.Leaderboard;
using PollaMundialista.Application.Predictions;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Api.Controllers;

[ApiController]
[Authorize]
public class LeaderboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public LeaderboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("/api/leaderboard")]
    public async Task<IActionResult> GetLeaderboard(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetLeaderboardQuery(), ct);

        return result.ToActionResult();
    }

    [HttpGet("/api/predictions/user/{userId:guid}")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<IActionResult> GetUserHistory(Guid userId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetUserHistoryQuery(userId), ct);

        return result.ToActionResult();
    }
}
