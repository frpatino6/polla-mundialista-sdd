using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Auth;

public record RegisterUserCommand(string Email, string Password) : ICommand<Result<UserDto>>;
