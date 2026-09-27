using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly AppDbContext _dbContext;

    public PasswordResetTokenRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
        _dbContext.PasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task AddAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        await _dbContext.PasswordResetTokens.AddAsync(token, ct);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        _dbContext.PasswordResetTokens.Update(token);
        await _dbContext.SaveChangesAsync(ct);
    }
}
