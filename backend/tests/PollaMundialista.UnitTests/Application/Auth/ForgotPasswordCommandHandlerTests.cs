using System.Security.Cryptography;
using System.Text;
using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Auth;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.UnitTests.Application.Auth;

public class ForgotPasswordCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IPasswordResetTokenRepository> _tokenRepository = new();
    private readonly Mock<IEmailSender> _emailSender = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();

    public ForgotPasswordCommandHandlerTests()
    {
        _dateTimeProvider.Setup(p => p.UtcNow).Returns(DateTimeOffset.UtcNow);
    }

    private ForgotPasswordCommandHandler CreateHandler() =>
        new(_userRepository.Object, _tokenRepository.Object, _emailSender.Object, _dateTimeProvider.Object);

    [Fact]
    public async Task Handle_EmailExists_ReturnsGenericSuccess_AndPersistsHashedToken()
    {
        const string email = "user@test.com";
        var user = new User(Guid.NewGuid(), email, "hashed-password", UserRole.User);
        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.Handle(new ForgotPasswordCommand(email), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Si el correo está registrado, se enviará un enlace de recuperación.", result.Value!.Message);
        _tokenRepository.Verify(r => r.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Once);
        _emailSender.Verify(s => s.SendPasswordResetLinkAsync(email, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_EmailDoesNotExist_ReturnsSameGenericSuccess_AndNeverPersistsOrSendsEmail()
    {
        const string email = "noexiste@test.com";
        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new ForgotPasswordCommand(email), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Si el correo está registrado, se enviará un enlace de recuperación.", result.Value!.Message);
        _tokenRepository.Verify(r => r.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()), Times.Never);
        _emailSender.Verify(s => s.SendPasswordResetLinkAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_EmailExists_And_EmailDoesNotExist_ReturnIdenticalMessage()
    {
        const string existingEmail = "user2@test.com";
        var user = new User(Guid.NewGuid(), existingEmail, "hashed-password", UserRole.User);
        _userRepository.Setup(r => r.GetByEmailAsync(existingEmail, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _userRepository.Setup(r => r.GetByEmailAsync("noexiste2@test.com", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var existingResult = await handler.Handle(new ForgotPasswordCommand(existingEmail), CancellationToken.None);
        var missingResult = await handler.Handle(new ForgotPasswordCommand("noexiste2@test.com"), CancellationToken.None);

        Assert.Equal(existingResult.IsSuccess, missingResult.IsSuccess);
        Assert.Equal(existingResult.Value!.Message, missingResult.Value!.Message);
    }

    [Fact]
    public async Task Handle_EmailExists_StoresHashedTokenNotPlainText()
    {
        const string email = "hash-check@test.com";
        var user = new User(Guid.NewGuid(), email, "hashed-password", UserRole.User);
        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        PasswordResetToken? capturedToken = null;
        _tokenRepository
            .Setup(r => r.AddAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
            .Callback<PasswordResetToken, CancellationToken>((token, _) => capturedToken = token)
            .Returns(Task.CompletedTask);

        string? capturedRawToken = null;
        _emailSender
            .Setup(s => s.SendPasswordResetLinkAsync(email, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, CancellationToken>((_, token, _) => capturedRawToken = token)
            .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        await handler.Handle(new ForgotPasswordCommand(email), CancellationToken.None);

        Assert.NotNull(capturedToken);
        Assert.NotNull(capturedRawToken);

        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(capturedRawToken!)));
        Assert.Equal(expectedHash, capturedToken!.TokenHash);
        Assert.NotEqual(capturedRawToken, capturedToken.TokenHash);
    }
}
