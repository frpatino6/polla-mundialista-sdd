using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Application.Abstractions;

public interface IPredictionRepository
{
    Task<Prediction?> GetByUserAndMatchAsync(Guid userId, Guid matchId, CancellationToken ct = default);

    Task<IReadOnlyList<Prediction>> GetByMatchIdAsync(Guid matchId, CancellationToken ct = default);

    Task<IReadOnlyList<Prediction>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<Prediction>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(Prediction prediction, CancellationToken ct = default);

    Task UpdateAsync(Prediction prediction, CancellationToken ct = default);
}
