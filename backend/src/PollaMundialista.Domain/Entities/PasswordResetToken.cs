using PollaMundialista.Domain.Exceptions;

namespace PollaMundialista.Domain.Entities;

public class PasswordResetToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? ConsumedAt { get; private set; }

    public bool IsConsumed => ConsumedAt is not null;

    // Constructor privado sin parámetros exclusivo para materialización de EF Core (mismo patrón que Prediction).
    private PasswordResetToken()
    {
    }

    public PasswordResetToken(Guid id, Guid userId, string tokenHash, DateTimeOffset expiresAt)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new DomainException(DomainErrorMessages.TokenHashRequired);

        Id = id;
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
    }

    public bool IsExpired(DateTimeOffset now) => now >= ExpiresAt;

    public void Consume(DateTimeOffset consumedAt)
    {
        if (IsConsumed)
            throw new DomainException(DomainErrorMessages.PasswordResetTokenAlreadyConsumed);

        ConsumedAt = consumedAt;
    }
}
