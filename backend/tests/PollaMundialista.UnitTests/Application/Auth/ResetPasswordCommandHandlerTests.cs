using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Auth;
using PollaMundialista.Application.Enums;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.UnitTests.Application.Auth;

public class ResetPasswordCommandHandlerTests
{
    private readonly Mock<IPasswordResetTokenRepository> _tokenRepository = new();
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();

    private readonly DateTimeOffset _now = DateTimeOffset.UtcNow;

    public ResetPasswordCommandHandlerTests()
    {
        _dateTimeProvider.Setup(p => p.UtcNow).Returns(_now);
    }

    private ResetPasswordCommandHandler CreateHandler() =>
        new(_tokenRepository.Object, _userRepository.Object, _passwordHasher.Object, _dateTimeProvider.Object);

    [Fact]
    public async Task Handle_TokenNotFound_ReturnsValidationError_WithInvalidMessage()
    {
        _tokenRepository.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PasswordResetToken?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new ResetPasswordCommand("raw-token", "NewPassword123"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Validation, result.Error);
        Assert.Equal("El token de reseteo no es válido.", result.ErrorMessage);
    }

    [Fact]
    public async Task Handle_TokenExpired_ReturnsValidationError_AndNeverChangesPassword()
    {
        var resetToken = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash-value", _now.AddHours(-1));
        _tokenRepository.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(resetToken);

        var handler = CreateHandler();
        var result = await handler.Handle(new ResetPasswordCommand("raw-token", "NewPassword123"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Validation, result.Error);
        Assert.Equal("El token de reseteo expiró.", result.ErrorMessage);
        _userRepository.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _tokenRepository.Verify(r => r.UpdateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_TokenAlreadyConsumed_ReturnsValidationError()
    {
        var resetToken = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash-value", _now.AddHours(1));
        resetToken.Consume(_now.AddMinutes(-1));
        _tokenRepository.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(resetToken);

        var handler = CreateHandler();
        var result = await handler.Handle(new ResetPasswordCommand("raw-token", "NewPassword123"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Validation, result.Error);
        Assert.Equal("El token de reseteo ya fue utilizado.", result.ErrorMessage);
    }

    [Fact]
    public async Task Handle_ValidToken_ChangesPassword_ConsumesToken_AndReturnsSuccess()
    {
        const string newPassword = "NewPassword123";
        const string hashedPassword = "new-hashed-password";
        var user = new User(Guid.NewGuid(), "user@test.com", "old-hashed-password", UserRole.User);
        var resetToken = new PasswordResetToken(Guid.NewGuid(), user.Id, "hash-value", _now.AddHours(1));

        _tokenRepository.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(resetToken);
        _userRepository.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Hash(newPassword)).Returns(hashedPassword);

        var handler = CreateHandler();
        var result = await handler.Handle(new ResetPasswordCommand("raw-token", newPassword), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Contraseña actualizada correctamente.", result.Value!.Message);
        Assert.Equal(hashedPassword, user.PasswordHash);
        Assert.True(resetToken.IsConsumed);
        _userRepository.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
        _tokenRepository.Verify(r => r.UpdateAsync(resetToken, It.IsAny<CancellationToken>()), Times.Once);
    }
}
