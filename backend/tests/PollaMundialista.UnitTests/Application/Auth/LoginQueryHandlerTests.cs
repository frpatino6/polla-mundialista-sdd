using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Auth;
using PollaMundialista.Application.Enums;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.UnitTests.Application.Auth;

public class LoginQueryHandlerTests
{
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGenerator = new();

    private LoginQueryHandler CreateHandler() =>
        new(_userRepository.Object, _passwordHasher.Object, _jwtTokenGenerator.Object);

    [Fact]
    public async Task Handle_ValidCredentials_ReturnsSuccessWithToken()
    {
        const string email = "user@test.com";
        const string password = "Password123";
        const string token = "jwt-token";
        var user = new User(Guid.NewGuid(), email, "hashed-password", UserRole.User);

        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify(password, user.PasswordHash)).Returns(true);
        _jwtTokenGenerator.Setup(g => g.GenerateToken(user.Id, user.Email, user.Role)).Returns(token);

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginQuery(email, password), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(token, result.Value!.Token);
        Assert.Equal(user.Id, result.Value.UserId);
        Assert.Equal(email, result.Value.Email);
        Assert.Equal(UserRole.User, result.Value.Role);
    }

    [Fact]
    public async Task Handle_EmailDoesNotExist_ReturnsUnauthorized_AndNeverGeneratesToken()
    {
        const string email = "inexistente@test.com";
        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginQuery(email, "Password123"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.Error);
        Assert.Equal("Credenciales inválidas.", result.ErrorMessage);
        _jwtTokenGenerator.Verify(g => g.GenerateToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UserRole>()), Times.Never);
    }

    [Fact]
    public async Task Handle_PasswordDoesNotMatch_ReturnsUnauthorized_WithSameMessageAsUnknownEmail()
    {
        const string email = "user@test.com";
        var user = new User(Guid.NewGuid(), email, "hashed-password", UserRole.User);

        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("wrong-password", user.PasswordHash)).Returns(false);

        var handler = CreateHandler();
        var result = await handler.Handle(new LoginQuery(email, "wrong-password"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.Error);
        Assert.Equal("Credenciales inválidas.", result.ErrorMessage);
        _jwtTokenGenerator.Verify(g => g.GenerateToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UserRole>()), Times.Never);
    }
}
