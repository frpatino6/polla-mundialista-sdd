using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Application.Abstractions;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);

    Task AddAsync(PasswordResetToken token, CancellationToken ct = default);

    Task UpdateAsync(PasswordResetToken token, CancellationToken ct = default);
}
