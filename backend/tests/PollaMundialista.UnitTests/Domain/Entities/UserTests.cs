using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Domain.Exceptions;

namespace PollaMundialista.UnitTests.Domain.Entities;

public class UserTests
{
    [Fact]
    public void Constructor_ValidData_CreatesUser()
    {
        var id = Guid.NewGuid();

        var user = new User(id, "user@example.com", "hashed-password", UserRole.User);

        Assert.Equal(id, user.Id);
        Assert.Equal("user@example.com", user.Email);
        Assert.Equal("hashed-password", user.PasswordHash);
        Assert.Equal(UserRole.User, user.Role);
    }

    [Fact]
    public void Constructor_EmptyEmail_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => new User(Guid.NewGuid(), "", "hashed-password", UserRole.User));
    }

    [Fact]
    public void Constructor_EmailWithoutAtSign_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => new User(Guid.NewGuid(), "invalid-email", "hashed-password", UserRole.User));
    }

    [Fact]
    public void Constructor_EmptyPasswordHash_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() => new User(Guid.NewGuid(), "user@example.com", "", UserRole.User));
    }
}
