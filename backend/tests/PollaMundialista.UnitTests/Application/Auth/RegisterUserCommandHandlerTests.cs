using Moq;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Auth;
using PollaMundialista.Application.Enums;
using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;

namespace PollaMundialista.UnitTests.Application.Auth;

public class RegisterUserCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();

    private RegisterUserCommandHandler CreateHandler() =>
        new(_userRepository.Object, _passwordHasher.Object);

    [Fact]
    public async Task Handle_NewEmail_CreatesUserWithUserRoleAndReturnsSuccess()
    {
        const string email = "nuevo@test.com";
        const string password = "Password123";
        const string hashedPassword = "hashed-password";

        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        _passwordHasher.Setup(h => h.Hash(password)).Returns(hashedPassword);

        var handler = CreateHandler();
        var command = new RegisterUserCommand(email, password);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(email, result.Value!.Email);
        Assert.Equal(UserRole.User, result.Value.Role);
        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_EmailAlreadyRegistered_ReturnsConflict_AndNeverAddsUser()
    {
        const string email = "existente@test.com";
        var existingUser = new User(Guid.NewGuid(), email, "hash", UserRole.User);

        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(existingUser);

        var handler = CreateHandler();
        var command = new RegisterUserCommand(email, "Password123");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Conflict, result.Error);
        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_NewEmail_StoresHashedPasswordNotPlainText()
    {
        const string email = "hash@test.com";
        const string password = "Password123";
        const string hashedPassword = "hashed-password";
        User? capturedUser = null;

        _userRepository.Setup(r => r.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        _passwordHasher.Setup(h => h.Hash(password)).Returns(hashedPassword);
        _userRepository
            .Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((user, _) => capturedUser = user)
            .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var command = new RegisterUserCommand(email, password);

        await handler.Handle(command, CancellationToken.None);

        Assert.NotNull(capturedUser);
        Assert.Equal(hashedPassword, capturedUser!.PasswordHash);
        Assert.NotEqual(password, capturedUser.PasswordHash);
    }
}
