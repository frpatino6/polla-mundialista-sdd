using Mediator;
using Microsoft.AspNetCore.Mvc;
using PollaMundialista.Application.Auth;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Enums;

namespace PollaMundialista.Api.Controllers;

// La función local `ToHttpResult` de Program.cs vive dentro del método Main generado por los
// top-level statements: no es un miembro accesible de la clase parcial Program desde otro
// archivo, así que se replica aquí como método privado en vez de compartirla.
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        var command = new RegisterUserCommand(request.Email, request.Password);
        var result = await _mediator.Send(command, ct);

        return ToHttpResult(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var query = new LoginQuery(request.Email, request.Password);
        var result = await _mediator.Send(query, ct);

        return ToHttpResult(result);
    }

    private IActionResult ToHttpResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
            return Ok(result.Value);

        return result.Error switch
        {
            ResultError.NotFound => NotFound(new { message = result.ErrorMessage }),
            ResultError.Conflict => Conflict(new { message = result.ErrorMessage }),
            ResultError.Validation => BadRequest(new { message = result.ErrorMessage }),
            ResultError.Unauthorized => Unauthorized(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }
}

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);
