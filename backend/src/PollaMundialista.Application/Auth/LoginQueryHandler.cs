using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Application.Enums;

namespace PollaMundialista.Application.Auth;

public class LoginQueryHandler : IQueryHandler<LoginQuery, Result<LoginResultDto>>
{
    private const string InvalidCredentialsMessage = "Credenciales inválidas.";

    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public LoginQueryHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async ValueTask<Result<LoginResultDto>> Handle(LoginQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            return Result<LoginResultDto>.Failure(ResultError.Unauthorized, InvalidCredentialsMessage);

        var token = _jwtTokenGenerator.GenerateToken(user.Id, user.Email, user.Role);

        return Result<LoginResultDto>.Success(new LoginResultDto(token, user.Id, user.Email, user.Role));
    }
}
