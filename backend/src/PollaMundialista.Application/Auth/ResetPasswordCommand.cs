using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Auth;

public record ResetPasswordCommand(string Token, string NewPassword) : ICommand<Result<ResetPasswordResultDto>>;
