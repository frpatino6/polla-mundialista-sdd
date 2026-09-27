using Mediator;
using Microsoft.AspNetCore.Mvc;
using PollaMundialista.Api.Common;
using PollaMundialista.Application.Auth;

namespace PollaMundialista.Api.Controllers;

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

        return result.ToActionResult();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var query = new LoginQuery(request.Email, request.Password);
        var result = await _mediator.Send(query, ct);

        return result.ToActionResult();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        var command = new ForgotPasswordCommand(request.Email);
        var result = await _mediator.Send(command, ct);

        return result.ToActionResult();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken ct)
    {
        var command = new ResetPasswordCommand(request.Token, request.NewPassword);
        var result = await _mediator.Send(command, ct);

        return result.ToActionResult();
    }
}

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);
