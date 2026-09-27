using Microsoft.EntityFrameworkCore;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _dbContext;

    public UserRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public async Task AddAsync(User user, CancellationToken ct = default)
    {
        await _dbContext.Users.AddAsync(user, ct);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(ct);
    }
}
