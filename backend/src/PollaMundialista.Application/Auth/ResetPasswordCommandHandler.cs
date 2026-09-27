using System.Security.Cryptography;
using System.Text;
using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Application.Enums;

namespace PollaMundialista.Application.Auth;

public class ResetPasswordCommandHandler : ICommandHandler<ResetPasswordCommand, Result<ResetPasswordResultDto>>
{
    private const string InvalidTokenMessage = "El token de reseteo no es válido.";
    private const string ExpiredTokenMessage = "El token de reseteo expiró.";
    private const string ConsumedTokenMessage = "El token de reseteo ya fue utilizado.";
    private const string SuccessMessage = "Contraseña actualizada correctamente.";

    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ResetPasswordCommandHandler(
        IPasswordResetTokenRepository tokenRepository,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IDateTimeProvider dateTimeProvider)
    {
        _tokenRepository = tokenRepository;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _dateTimeProvider = dateTimeProvider;
    }

    public async ValueTask<Result<ResetPasswordResultDto>> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(request.Token);
        var resetToken = await _tokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
        if (resetToken is null)
            return Result<ResetPasswordResultDto>.Failure(ResultError.Validation, InvalidTokenMessage);

        var now = _dateTimeProvider.UtcNow;
        if (resetToken.IsExpired(now))
            return Result<ResetPasswordResultDto>.Failure(ResultError.Validation, ExpiredTokenMessage);

        if (resetToken.IsConsumed)
            return Result<ResetPasswordResultDto>.Failure(ResultError.Validation, ConsumedTokenMessage);

        var user = await _userRepository.GetByIdAsync(resetToken.UserId, cancellationToken);
        if (user is null)
            return Result<ResetPasswordResultDto>.Failure(ResultError.Validation, InvalidTokenMessage);

        user.ChangePassword(_passwordHasher.Hash(request.NewPassword));
        resetToken.Consume(now);

        await _userRepository.UpdateAsync(user, cancellationToken);
        await _tokenRepository.UpdateAsync(resetToken, cancellationToken);

        return Result<ResetPasswordResultDto>.Success(new ResetPasswordResultDto(SuccessMessage));
    }

    private static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
