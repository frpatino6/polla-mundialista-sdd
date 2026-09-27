using PollaMundialista.Domain.Entities;
using PollaMundialista.Domain.Exceptions;

namespace PollaMundialista.UnitTests.Domain.Entities;

public class PasswordResetTokenTests
{
    [Fact]
    public void Constructor_ValidData_CreatesToken()
    {
        var id = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);

        var token = new PasswordResetToken(id, userId, "hash-value", expiresAt);

        Assert.Equal(id, token.Id);
        Assert.Equal(userId, token.UserId);
        Assert.Equal("hash-value", token.TokenHash);
        Assert.Equal(expiresAt, token.ExpiresAt);
        Assert.Null(token.ConsumedAt);
        Assert.False(token.IsConsumed);
    }

    [Fact]
    public void Constructor_EmptyTokenHash_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() =>
            new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "", DateTimeOffset.UtcNow.AddHours(1)));
    }

    [Fact]
    public void IsExpired_BeforeExpiration_ReturnsFalse()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);
        var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash-value", expiresAt);

        Assert.False(token.IsExpired(expiresAt.AddMinutes(-1)));
    }

    [Fact]
    public void IsExpired_AfterExpiration_ReturnsTrue()
    {
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);
        var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash-value", expiresAt);

        Assert.True(token.IsExpired(expiresAt.AddMinutes(1)));
    }

    [Fact]
    public void Consume_NotYetConsumed_SetsConsumedAtAndIsConsumed()
    {
        var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash-value", DateTimeOffset.UtcNow.AddHours(1));
        var consumedAt = DateTimeOffset.UtcNow;

        token.Consume(consumedAt);

        Assert.True(token.IsConsumed);
        Assert.Equal(consumedAt, token.ConsumedAt);
    }

    [Fact]
    public void Consume_AlreadyConsumed_ThrowsDomainException()
    {
        var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash-value", DateTimeOffset.UtcNow.AddHours(1));
        token.Consume(DateTimeOffset.UtcNow);

        Assert.Throws<DomainException>(() => token.Consume(DateTimeOffset.UtcNow));
    }
}
