using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Application.Enums;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.Application.Auth;

public class RegisterUserCommandHandler : ICommandHandler<RegisterUserCommand, Result<UserDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterUserCommandHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
    }

    public async ValueTask<Result<UserDto>> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var existingUser = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existingUser is not null)
            return Result<UserDto>.Failure(ResultError.Conflict, "El email ya está registrado.");

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = new User(Guid.NewGuid(), request.Email, passwordHash, UserRole.User);

        await _userRepository.AddAsync(user, cancellationToken);

        return Result<UserDto>.Success(new UserDto(user.Id, user.Email, user.Role));
    }
}
