using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PollaMundialista.Api.Common;
using PollaMundialista.Application.Matches;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Api.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.Admin))]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPut("matches/{matchId:guid}/result")]
    public async Task<IActionResult> SubmitMatchResult(Guid matchId, MatchResultRequest request, CancellationToken ct)
    {
        var command = new SubmitMatchResultCommand(matchId, request.HomeScore, request.AwayScore);
        var result = await _mediator.Send(command, ct);

        return result.ToActionResult();
    }
}
