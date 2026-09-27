using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Auth;

public record ForgotPasswordCommand(string Email) : ICommand<Result<ForgotPasswordResultDto>>;
