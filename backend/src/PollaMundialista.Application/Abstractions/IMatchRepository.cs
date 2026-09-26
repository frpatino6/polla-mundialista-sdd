using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Application.Abstractions;

public interface IMatchRepository
{
    Task<Match?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<Match>> GetAllAsync(CancellationToken ct = default);

    Task UpdateAsync(Match match, CancellationToken ct = default);
}
