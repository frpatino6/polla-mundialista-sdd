using Mediator;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;

namespace PollaMundialista.Application.Auth;

public record LoginQuery(string Email, string Password) : IQuery<Result<LoginResultDto>>;
