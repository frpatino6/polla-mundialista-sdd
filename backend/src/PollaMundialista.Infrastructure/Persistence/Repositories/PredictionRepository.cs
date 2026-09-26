using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence.Repositories;

public class PredictionRepository : IPredictionRepository
{
    private readonly AppDbContext _dbContext;

    public PredictionRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Prediction?> GetByUserAndMatchAsync(Guid userId, Guid matchId, CancellationToken ct = default) =>
        _dbContext.Predictions.FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == matchId, ct);

    public async Task<IReadOnlyList<Prediction>> GetByMatchIdAsync(Guid matchId, CancellationToken ct = default) =>
        await _dbContext.Predictions.Where(p => p.MatchId == matchId).ToListAsync(ct);

    public async Task<IReadOnlyList<Prediction>> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        await _dbContext.Predictions.Where(p => p.UserId == userId).ToListAsync(ct);

    public async Task<IReadOnlyList<Prediction>> GetAllAsync(CancellationToken ct = default) =>
        await _dbContext.Predictions.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(Prediction prediction, CancellationToken ct = default)
    {
        await _dbContext.Predictions.AddAsync(prediction, ct);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Prediction prediction, CancellationToken ct = default)
    {
        _dbContext.Predictions.Update(prediction);
        await _dbContext.SaveChangesAsync(ct);
    }
}
