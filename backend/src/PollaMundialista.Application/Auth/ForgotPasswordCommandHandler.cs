using System.Security.Cryptography;
using System.Text;
using Mediator;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Application.Auth;

public class ForgotPasswordCommandHandler : ICommandHandler<ForgotPasswordCommand, Result<ForgotPasswordResultDto>>
{
    private const string GenericMessage = "Si el correo está registrado, se enviará un enlace de recuperación.";
    private const int TokenExpirationHours = 1;

    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IEmailSender _emailSender;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ForgotPasswordCommandHandler(
        IUserRepository userRepository,
        IPasswordResetTokenRepository tokenRepository,
        IEmailSender emailSender,
        IDateTimeProvider dateTimeProvider)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _emailSender = emailSender;
        _dateTimeProvider = dateTimeProvider;
    }

    public async ValueTask<Result<ForgotPasswordResultDto>> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is not null)
        {
            var rawToken = GenerateRawToken();
            var tokenHash = HashToken(rawToken);
            var expiresAt = _dateTimeProvider.UtcNow.AddHours(TokenExpirationHours);

            var resetToken = new PasswordResetToken(Guid.NewGuid(), user.Id, tokenHash, expiresAt);
            await _tokenRepository.AddAsync(resetToken, cancellationToken);

            await _emailSender.SendPasswordResetLinkAsync(user.Email, rawToken, cancellationToken);
        }

        // Anti-enumeración (crítico, design.md §7.2): la respuesta es SIEMPRE la misma Success con el
        // mismo mensaje genérico, exista o no el email — nunca hay un branch de Failure aquí. El token
        // crudo nunca viaja en el body de esta respuesta HTTP en ningún entorno; solo lo recibe
        // IEmailSender (que en Development lo loguea del lado servidor, ver NoOpEmailSender).
        return Result<ForgotPasswordResultDto>.Success(new ForgotPasswordResultDto(GenericMessage));
    }

    // El token ya es un secreto aleatorio de 32 bytes con entropía completa (RandomNumberGenerator),
    // a diferencia de una contraseña de usuario: no necesita un hash lento/adaptativo (bcrypt), y
    // además bcrypt no permite lookup determinístico por hash (salt distinto en cada llamada). SHA-256
    // es determinístico y permite buscar el token por su hash en la tabla.
    private static string GenerateRawToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

    private static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
