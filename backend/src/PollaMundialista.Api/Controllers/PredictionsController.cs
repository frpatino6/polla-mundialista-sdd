using System.Security.Claims;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PollaMundialista.Api.Common;
using PollaMundialista.Application.Matches;
using PollaMundialista.Application.Predictions;

namespace PollaMundialista.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/predictions")]
public class PredictionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PredictionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("/api/matches")]
    public async Task<IActionResult> GetMatches(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMatchesQuery(), ct);
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<IActionResult> Post(PredictionRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var command = new RegisterPredictionCommand(
            userId,
            request.MatchId,
            request.PredictedHomeScore,
            request.PredictedAwayScore);

        var result = await _mediator.Send(command, ct);

        return result.ToActionResult();
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyHistory(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _mediator.Send(new GetUserHistoryQuery(userId), ct);

        return Ok(result.Value);
    }
}
