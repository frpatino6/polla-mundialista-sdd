using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence.Repositories;

public class MatchRepository : IMatchRepository
{
    private readonly AppDbContext _dbContext;

    public MatchRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Match?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _dbContext.Matches.FirstOrDefaultAsync(m => m.Id == id, ct);

    public async Task<IReadOnlyList<Match>> GetAllAsync(CancellationToken ct = default) =>
        await _dbContext.Matches.AsNoTracking().ToListAsync(ct);

    public async Task UpdateAsync(Match match, CancellationToken ct = default)
    {
        _dbContext.Matches.Update(match);
        await _dbContext.SaveChangesAsync(ct);
    }
}
